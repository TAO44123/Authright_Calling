# Vapi 配置步骤（Call Authright Demo）

更新日期：2026-09-29

## 当前阶段：先让真实来电接通

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

## 下一阶段：连接我们的转写保存服务

本地网页、Webhook 和 SQLite 服务位于 [`app/`](./app/README.md)。启动后，在 Assistant 的 **Advanced → Webhook Server / Server URL** 填公开 HTTPS 隧道地址，例如 `https://<tunnel-domain>/webhooks/vapi`。在 Server Messages 中保留或选择 `end-of-call-report`；配置 `X-Vapi-Secret` 凭据，并与本地 `.env.local` 的 `VAPI_WEBHOOK_SECRET` 保持一致，然后 **Publish**。Vapi 会在通话结束后把包含 `call.id` 和 `artifact.transcript` 的报告发送过来。不要把私钥放进网页。

本机服务可使用 HTTP；由隧道提供公网 HTTPS 地址。无需先部署正式服务器。隧道地址变化后，需要同步更新 Vapi 的 Server URL。

## 本阶段需要记录的信息

- Assistant 名称或 ID
- 入站电话号码（不是账号密钥）
- 一通测试来电是否接通、Vapi 控制台是否出现文字转写

不要把 Vapi 私钥、电话服务商密钥或回调凭据写进仓库文件。

## 官方参考

- [创建 Assistant 并绑定入站号码](https://docs.vapi.ai/assistants/examples/inbound-support)
- [免费 Vapi 号码的范围和限制](https://docs.vapi.ai/free-telephony)
- [录音与转写设置](https://docs.vapi.ai/assistants/call-recording)
- [本地开发接收 Server URL 事件](https://docs.vapi.ai/server-url/developing-locally)
- [Server URL 配置](https://docs.vapi.ai/server-url/setting-server-urls)
- [通话结束报告格式](https://docs.vapi.ai/server-url/events)
