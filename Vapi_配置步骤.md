# Vapi 配置步骤（Call Authright）

更新日期：2026-09-29

当前号码为 `+17812096469`，已绑定 Assistant，并已把 Webhook Server 指向 `https://calling.authright.com/webhooks/vapi`。真实来电结束后，转写已成功写入线上 SQLite；当前部署状态见 [deploy/README.md](deploy/README.md)。以下步骤保留供以后检查或重新配置。

## 初次配置：让真实来电接通

### 1. 登录与检查额度

打开 [Vapi Dashboard](https://dashboard.vapi.ai/)，确认当前组织可用。如果之后电话无法接通，检查 Billing/Credits；号码可能免费，但通话本身会消耗额度。

### 2. 创建 Assistant

1. 左侧进入 **Assistants** → **Create Assistant** → 选 **Blank Template**。
2. 名称填 `Call Authright`。
3. **First Message** 填：

   > Hello, you've reached Call Authright. I'm an AI assistant. This call will be transcribed for our demo. How can I help you?
4. **System Prompt** 填：

   ```text
   You are the AI phone assistant for Call Authright. Speak English in short, natural sentences.
   Ask the caller what they need and respond helpfully. If they ask for an appointment, you may ask for their preferred date and time and repeat the request back.
   This demo cannot check availability or create bookings. Never say an appointment is booked, confirmed, or reserved. Explain clearly that you can note the request but cannot confirm it during this call.
   Do not ask for payment details or other sensitive information. If you do not know a business fact, say you do not know rather than inventing it.
   ```

5. 使用控制台提供的默认模型、声音和转写器即可，先不要接任何 Tools。点击 **Publish**；控制台中的草稿修改需要发布才会生效。

### 3. 开启文字转写

打开这个 Assistant 的 **Advanced** → **Recording & Artifacts**：开启 **Transcript**，关闭 **Audio Recording**。本轮只保存文字，不需要音频。修改后再次 **Publish**。

### 4. 创建并绑定入站电话号码

1. 左侧进入 **Phone Numbers** → **Create Phone Number**。
2. 在美国境内测试，可选 **Free Vapi Number**，输入可用的美国区号并创建。号码激活可能需要几分钟。该号码只支持入站和美国国内使用；如果需要其他地区号码，按 Vapi 文档从受支持的电话服务商导入。
3. 打开新号码，在 **Inbound Settings** 里选择 `Call Authright`，点击 **Save**。
4. 记下完整国际格式号码，例如 `+1XXXXXXXXXX`。之后网页显示和 `tel:` 链接都使用这个号码。

### 5. 先拨一次真实电话

从手机直接拨打该号码，确认 AI 开场、能与你进行两轮对话。挂断后到 Vapi Dashboard 的 **Logs → Calls** 打开这通电话，查看文字转写。此时不需要网页、服务器或 HTTPS 回调。

## 连接转写保存服务（已完成）

网页、Webhook 和 SQLite 服务位于 [`app/`](./app/README.md)。Assistant 的 **Advanced → Webhook Server / Server URL** 已填写 `https://calling.authright.com/webhooks/vapi`。已关联 Bearer Token Custom Credential：Header Name 为 `X-Vapi-Secret`、Bearer Prefix 关闭、Token 与服务器 `.env.local` 的 `VAPI_WEBHOOK_SECRET` 一致，并已发布 Assistant。Vapi 默认发送 `end-of-call-report`，无需寻找单独的开关。通话结束后，报告中的通话 ID 和文字转写会保存到 SQLite。不要把私钥放进网页。

当前由 EC2 上的 Caddy 提供 HTTPS，不需要隧道。服务器域名变化后，需要同步更新 Vapi 的 Server URL。

通话记录页 `/callrecord` 也支持手动从 Vapi 拉取最近的通话。此功能需要 Vapi **Private API Key**，只填写在应用服务器的 `.env.local` 中，变量名为 `VAPI_PRIVATE_API_KEY`；它与 Webhook 使用的 `VAPI_WEBHOOK_SECRET` 是两种不同的凭据。

## 当前已确认的信息

- 号码：`+17812096469`
- 真实来电可以接通，Vapi 控制台和网站记录页都能看到文字转写。
- 线上 SQLite 已保存通话记录；记录页也可手动从 Vapi 刷新，按 call ID 去重。

不要把 Vapi 私钥、电话服务商密钥或回调凭据写进仓库文件。

## 官方参考

- [创建 Assistant 并绑定入站号码](https://docs.vapi.ai/assistants/examples/inbound-support)
- [免费 Vapi 号码的范围和限制](https://docs.vapi.ai/free-telephony)
- [录音与转写设置](https://docs.vapi.ai/assistants/call-recording)
- [本地开发接收 Server URL 事件](https://docs.vapi.ai/server-url/developing-locally)
- [Server URL 配置](https://docs.vapi.ai/server-url/setting-server-urls)
- [通话结束报告格式](https://docs.vapi.ai/server-url/events)
