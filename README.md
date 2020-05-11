Wechaty 订阅机器人 [![Powered by Wechaty](https://img.shields.io/badge/Powered%20By-Wechaty-green.svg)](https://github.com/chatie/wechaty)[![Wechaty开源激励计划](https://img.shields.io/badge/Wechaty-开源激励计划-green.svg)](https://github.com/juzibot/Welcome/wiki/Everything-about-Wechaty)
==================

需求
----

想实现一个在微信上可以订阅主流媒体平台的频道（初步实现 bilibili，后面可以扩展甚至微博之类的信息源），
如果频道有更新，即可通过机器人第一时间将发布的媒体推送给订阅的用户。

## 1.0. 如何安装

1. clone 本项目

```
git clone https://github.com/fish-ball/wechaty-subsbot
```

2. 准备好 Node.js 运行环境

3. 安装 typescript 和 ts-node

```
npm i -g typescript ts-node
```

4. 安装项目依赖

```
npm i
```

5. 填写配置

将 `config.ts.example` 复制为 `config.ts`，并且填写申请到的 token，暂时只支持 padplus。

6. 运行启动脚本

```
ts-node bot.ts
```

## 2.0. 如何使用

1. 第一次运行启动时 console 会显示登录的二维码，用机器人的微信扫码登录，登录成功机器人即已经上线工作。

2. 其他用户添加机器人为好友，向其转发B站up主的页面，（直接微信转发或者复制链接再发都行），即可订阅这个UP主的频道。

3. 在订阅生效之后只要 UP 主新发了视频，就可以马上收到机器人的推送。

4. 在与机器人聊天中输入指令 `:list` 可以查询到目前已订阅的频道列表，显示这些频道的 id 和名称。

5. 如果需要退订，输入指令 `:leave <id>` 即可退订 id 对应的频道。

## DEMO

测试机器人(wx_easecloud)：

![逸云科技](https://github.com/fish-ball/wechaty-subsbot/raw/master/wx_easecloud.jpg)

