import {Contact, Friendship, UrlLink, Wechaty} from 'wechaty';
import {MessageType, ScanStatus} from 'wechaty-puppet';
// import {PuppetPadplus} from 'wechaty-puppet-padplus';
import QrcodeTerminal from 'qrcode-terminal';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import config from './config';

const token = config.tokenDonut;
console.log(token);

// const puppet = new puppetpadplus({
//   token,
// });

// const bot = new Wechaty({
//   puppet,
//   name: config.name, // generate xxxx.memory-card.json and save login data for the next login
// });

const bot = new Wechaty({
  // puppet: 'wechaty-puppet-padplus',
  puppet: 'wechaty-puppet-hostie',
  puppetOptions: {
    token,
  },
});

console.log('bot created');

bot.on('scan', (qrcode, status) => {
  if (status === ScanStatus.Waiting) {
    console.log(qrcode);
    QrcodeTerminal.generate(qrcode, {
      small: true,
    });
  }
}).on('message', async msg => {
  const text = msg.text();
  const sender = msg.from();
  if (!sender) return;

  const ctx = new UserContext(sender.id);
  ctx.data.subscriptions = ctx.data.subscriptions || {};

  // 查询指令
  if (/^:list$/.test(msg.text())) {
    await ctx.getSubscriptionList();
    return;
  }

  // 退订指令
  if (/^:leave \d+$/.test(msg.text())) {
    await ctx.leaveChannel(msg.text().split(' ')[1]);
    return;
  }

  // console.log(msg.from());
  // 只关注单聊收到的信息
  if (msg.room()) {
    console.log(msg);
    if (msg.text() === '#ding') {
      await msg.room()?.say('dong');
    }
    return;
  }

  const match = /https:\/\/space\.bilibili\.com\/(\d+)/.exec(text);
  if (!match) return;
  const channelId = match[1];

  // console.log(sender.id);
  ctx.data.subscriptions[channelId] = ctx.data.subscriptions[channelId] || {};
  const channel = ctx.data.subscriptions[channelId];
  channel.lastTimestamp = Number(new Date()) / 1000;

  // 加载频道名称
  const url = `https://api.bilibili.com/x/space/acc/info?mid=${channelId}&jsonp=jsonp`;
  const resp = await fetch(url);
  const channelInfo = JSON.parse(await resp.text());
  channel.name = channelInfo.data.name;

  await sender!.say(`你已成功订阅《${channel.name}》
:list - 查看当前订阅
:leave <id> - 退订指定频道`);

  console.log(ctx.data);
  await ctx.save();
}).on('login', async () => {
  // 每分钟查一下有没有新片发布
  setInterval(async () => {
    await SubscriptionRunner.check();
  }, 60000);
}).on('friendship', async friendship => {
  if (friendship.type() === Friendship.Type.Receive) {
    await friendship.accept();
    await friendship.contact().say('欢迎使用订阅机器人，将B站up主的页面分享过来就可以自动订阅哦，赶快试试吧！');
  }
}).start();

class UserContext {
  userId: string;
  fname: string;
  data: any = {};

  constructor(userId: string) {
    this.channelId = userId;
    this.fname = `data/${userId}.subs`;
    fs.mkdirSync(path.dirname(this.fname), {recursive: true, mode: 0o644});
    try {
      const content = fs.readFileSync(this.fname);
      this.data = JSON.parse(content && content.toString() || '{}');
      console.log(this.data);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        throw err;
      }
    }
  }

  async user() {
    return bot.Contact.find({id: this.userId});
  }

  async save() {
    // 获取
    await fs.promises.writeFile(this.fname, JSON.stringify(this.data));
    console.log('write ok');
  }

  async getSubscriptionList() {
    const content = Object.entries(this.data.subscriptions || {}).map(([channelId, channelInfo]) => {
      return `${channelId} - ${(channelInfo as any).name}`;
    }).join('\n');
    (await this.user())?.say(content);
  }

  async leaveChannel(channelId: string) {
    // console.log(this.data.subscriptions);
    const channel = this.data.subscriptions && this.data.subscriptions[channelId];
    if (!channel) {
      (await this.user())?.say('您没有订阅这个频道，请检查 ID 是否输入正确');
    }
    delete this.data.subscriptions[channelId];
    await this.save();
    (await this.user())?.say(`您已成功退订《${channel.name}》`);
  }

  static getUserIdList() {
    try {
      const files = fs.readdirSync('data');
      return files.filter(f => /\.subs$/.test(f))
        .map(f => f.replace(/\.subs/, ''));
    } catch (err) {
      if (err.code !== 'ENOENT') {
        throw err;
      }
      return [];
    }
  }

}

// 定时获取订阅的 UP 主的视频，如果发现更新则推送
class SubscriptionRunner {
  static check() {
    UserContext.getUserIdList().forEach(async userId => {
      console.log(userId);
      const ctx = new UserContext(userId);
      const contact = await ctx.user();
      if (!contact) return;
      // 要检测是否加了好友
      if (!contact.friend()) {
        // 不是好友申请加好友
        // await Friendship.add(contact, '我是订阅机器人');
        return;
      }
      // console.log(ctx.data);
      await Promise.all(Object.entries(ctx.data.subscriptions || {}).map(async ([channelId, channelInfo]) => {
        const url = `https://api.bilibili.com/x/space/arc/search?mid=${channelId}&ps=30&tid=0&pn=1&keyword=&order=pubdate&jsonp=jsonp`;
        const resp = await fetch(url);
        const data = JSON.parse(await resp.text());
        if (!(data && data.data && data.data.list)) return;
        await Promise.all(data.data.list.vlist.map(async (video: any) => {
          if (video.created > (channelInfo as any).lastTimestamp || 0) {
            const linkPayload = new UrlLink({
              description: video.description,
              thumbnailUrl: video.pic.replace(/^\/\//, 'https://'),
              title: video.title,
              url: `https://bilibili.com/video/${video.bvid}`,
            });
            contact.say(linkPayload);
            // 为了避免因为时间不一致导致重复更新，使用最新的时间点来更新最近时间
            (channelInfo as any).lastTimestamp = video.created;
          }
        }));
      }));
      // 保存所有 ctx 的信息（主要是更新 lastTimestamp 时间）
      await ctx.save();
    });
  }
}

