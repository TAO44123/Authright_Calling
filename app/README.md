# Call Authright Demo

本地 Next.js 演示应用。网页提供电话号码、Call 和复制号码；Vapi 通话结束后，将双方文字转写通过 Webhook 保存到本地 SQLite。

`/callrecord` 是独立的通话记录页，显示最近 100 通已保存来电的时间、来电号码（如果 Vapi 提供）、通话状态和完整文字转写。主页不显示该页入口。没有收到回调时，记录页会显示空状态。

## 启动

需要 Node.js 24 或更新版本。

1. 在本目录运行 `npm install`。
2. 复制 `.env.example` 为 `.env.local`。
3. 在 `.env.local` 填写 `VAPI_PHONE_NUMBER`（完整国际格式，例如 `+12125550123`）和 `VAPI_WEBHOOK_SECRET`（自定的长随机字符串）。
4. 运行 `npm run dev`，打开 `http://localhost:3000`。在号码未配置前，网页会显示 “Number coming soon”，拨号和复制按钮不可用。

## 连接 Vapi 回调

1. 保持本地服务运行，用 HTTPS 隧道公开 3000 端口，例如 `ngrok http 3000`。
2. 在已保存的 Vapi Assistant 中，将 **Server URL** 设为 `https://<隧道域名>/webhooks/vapi`。
3. 在 Vapi 创建一个自定义 Bearer Token 凭据：Header Name 使用 `X-Vapi-Secret`，关闭 Bearer Prefix，Token 与 `.env.local` 中的 `VAPI_WEBHOOK_SECRET` 相同。把此凭据关联到 Assistant 的 Server URL。
4. 确认 Server Messages 包含 `end-of-call-report`，并发布 Assistant。
5. 打电话、挂断后，在本目录运行 `npm run calls`，读出最近十通的文字转写。数据库默认保存在 `data/calls.sqlite`。

不要把 `.env.local` 提交或分享给他人。隧道地址变化后，要更新 Vapi 的 Server URL。本轮只保存文字转写，不保存音频，也不创建预约。

当前 `/callrecord` 没有登录保护。部署到公网后，知道该路径的人可以查看通话转写；开放真实用户使用前需要增加访问控制。

## 查看 SQLite 内容

SQLite 是本地文件数据库，不需要填写服务器地址或端口。首次收到有效通话结束报告后，默认文件为本目录的 `data/calls.sqlite`。此前该文件不存在。

最简单的方式是在本目录运行 `npm run calls`，它会打印最近十通的文字转写。

如需直接查询数据库，可以运行：

```bash
sqlite3 -header -column data/calls.sqlite "SELECT vapi_call_id, started_at, ended_at, transcript_status FROM calls ORDER BY received_at DESC LIMIT 10;"
sqlite3 data/calls.sqlite "SELECT transcript FROM calls ORDER BY received_at DESC LIMIT 1;"
```

如果在 `.env.local` 修改了 `CALLS_DB_PATH`，查询时请使用该路径。

## 相关文档

- [本项目的 Vapi 配置步骤](../Vapi_配置步骤.md)
- [最小实施方案](../Voice_Call_Transcript_Demo_Plan_v0.2.md)
