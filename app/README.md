# Call Authright Demo

本地 Next.js 演示应用。网页提供电话号码、Call 和复制号码；Vapi 通话结束后，将双方文字转写通过 Webhook 保存到本地 SQLite。

`/callrecord` 是独立的通话记录页，显示最近 100 通已保存来电的时间、来电号码（如果 Vapi 提供）、通话状态和完整文字转写。主页不显示该页入口。没有记录时，页面会显示空状态。

## 启动

需要 Node.js 24 或更新版本。

1. 在本目录运行 `npm install`。
2. 复制 `.env.example` 为 `.env.local`。
3. 在 `.env.local` 填写 `VAPI_PHONE_NUMBER`（完整国际格式，例如 `+12125550123`）和 `VAPI_WEBHOOK_SECRET`（自定的长随机字符串）。
4. 运行 `npm run dev`，打开 `http://localhost:3000`。在号码未配置前，网页会显示 “Number coming soon”，拨号和复制按钮不可用。

### 手动从 Vapi 刷新通话记录

在 Vapi Dashboard 的 **API Keys → Private API Keys** 创建或复制私钥，放到本机或服务器的 `.env.local`：`VAPI_PRIVATE_API_KEY=<私钥>`。不要把私钥填到网页、发到聊天或提交到 Git。修改环境变量后重启应用。

打开 `/callrecord`，点击 **Refresh from Vapi**。服务端先按 `VAPI_PHONE_NUMBER` 找到对应的 Vapi 号码，再拉取该号码最近最多 100 通已结束的入站电话，必要时读取单通详情以补全转写，并保存到 SQLite。相同 Vapi 通话 ID 只保留一条；内容没有变化时不会重复写入。如果 Vapi 账号位于 EU 区域，可设置 `VAPI_API_BASE_URL=https://api.eu.vapi.ai`。

刷新按钮会显示新增、更新和已有记录数量。该功能需要服务器能访问 Vapi API，页面本身不接触私钥。

## 连接 Vapi 回调

1. 按 [EC2 部署记录](../deploy/README.md)将应用放到有 HTTPS 的服务器。
2. 在已保存的 Vapi Assistant 中，将 **Server URL** 设为 `https://<服务器域名>/webhooks/vapi`。
3. 在 Vapi 创建一个自定义 Bearer Token 凭据：Header Name 使用 `X-Vapi-Secret`，关闭 Bearer Prefix，Token 与 `.env.local` 中的 `VAPI_WEBHOOK_SECRET` 相同。把此凭据关联到 Assistant 的 Server URL。
4. 发布 Assistant。Vapi 默认发送 `end-of-call-report`，无需单独设置。
5. 打电话、挂断后，在本目录运行 `npm run calls`，读出最近十通的文字转写。数据库默认保存在 `data/calls.sqlite`。

不要把 `.env.local` 提交或分享给他人。服务器域名变化后，要更新 Vapi 的 Server URL。本轮只保存文字转写，不保存音频，也不创建预约。

按当前演示版要求，`/callrecord` 没有登录保护；知道该路径的人可以查看通话转写。

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
- [当前 EC2 部署计划](../EC2_部署计划.md)
- [初版最小实施方案（历史）](../Voice_Call_Transcript_Demo_Plan_v0.2.md)
