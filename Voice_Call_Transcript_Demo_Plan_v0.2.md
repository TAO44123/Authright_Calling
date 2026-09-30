# Call Authright 电话接听与通话转写 Demo — 最小实施方案

版本：0.2（按最小闭环修订）｜基于 `Voice_Appointment_Demo_Spec_v0.1.md`｜2026-09-29

## 本轮目标

用户在网页看到电话号码，点击 **Call** 打开拨号器，或复制号码手动拨打 → 真实来电进入 Vapi → AI 接听并对话 → 挂断后 Vapi 将通话结束报告发给我们的服务 → 服务把双方的文字转写保存到 SQLite → 在本机读出这条记录。

这里的“通话内容”先指**文字转写**，不保存音频文件。AI 可以谈预约需求，但本轮不创建或确认预约。

```text
网页（号码 + Call + 复制） → 手机拨号 → Vapi 号码 / Assistant
                                             ↓ 挂断后回调
                               HTTPS 隧道 → 本机服务 → SQLite
                                                      ↓
                                               读出文字转写
```

## 是否必须先部署网页？

**不必须。** Vapi 接真实电话依赖的是已配置的入站号码和 Assistant，网页只是展示同一个号码并唤起手机拨号器；可以先直接用手机拨打 Vapi 号码，验证接听。

需要公网可访问地址的是**接收 Vapi 回调的服务**。开发时先在本机运行网页和接收服务，再用 ngrok 等工具提供一个公开 HTTPS 地址，并把 `https://.../webhooks/vapi` 配到 Vapi。可以用同一个隧道地址在手机上打开网页完成整条演示链路。正式部署服务器可以等这条链路跑通后再做。

Vapi 文档将要求表述为“公网可访问的 HTTP 端点”，并提供通过 HTTPS 隧道连接本地服务的开发方式；生产环境使用 HTTPS。关键不是先部署网页，而是 Vapi 能访问回调地址。

## 实施顺序

1. **先通电话**：在 Vapi 创建 Assistant，设置开场白和简短提示词；取得或接入真实入站号码并绑定 Assistant。直接用手机拨打，确认 AI 能接听对话。
2. **做网页**：显示商家名称、Vapi 号码、`tel:` Call 按钮和复制号码按钮。网页不调用 Vapi API，也不需要浏览器通话 SDK。
3. **保存转写**：写一个小型本地服务，提供 `POST /webhooks/vapi`。接收 `end-of-call-report`，读取 `message.call.id` 和 `message.artifact.transcript`，把 call ID、时间与转写写入 SQLite。按 call ID 覆盖/更新同一条记录，避免同一通电话出现两条。提供一个本机查看方式，直接读出最近一通的转写内容。
4. **接通回调**：通过 HTTPS 隧道公开本机服务地址，配置到 Vapi Assistant 的 Server URL，启用通话结束报告。给回调配置一个共享凭据，避免外部随意写入假记录。
5. **演示整条链路**：手机打开网页、点击 Call、对话并挂断，然后在本机读出刚才的文字记录。若没收到记录，先看 Vapi 的 Webhook 日志和隧道请求日志。

## 跑通的标准

一通从网页号码发起的真实电话由 AI 接听；挂断后，本机 SQLite 有对应的通话记录，并能读出双方的文字转写。无需做完整的并发、失败重试或自动化验收。

## 本轮不做

预约数据库、空档查询、店主登录和收件箱、客户短信、音频保存、正式服务器部署。网页和回调服务放在同一个 Next.js 应用中；SQLite 存在本机。页面视觉沿用 Vote 的浅蓝色主题。

## 前置条件

Vapi 账号、可用的真实入站号码、测试手机，以及可创建公开 HTTPS 地址的隧道工具。Vapi 的转写功能需开启；若不需要音频，显式关闭录音。开场白告知来电者由 AI 接听、对话文字会保存，测试时不提供敏感信息。

参考：[Vapi 入站号码](https://docs.vapi.ai/assistants/examples/inbound-support) · [本地接收回调](https://docs.vapi.ai/server-url/developing-locally) · [通话结束报告](https://docs.vapi.ai/server-url/events) · [回调凭据](https://docs.vapi.ai/server-url/server-authentication)
