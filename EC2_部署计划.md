# Call Authright：EC2 最小部署计划

实际部署环境与运行命令见 [deploy/README.md](deploy/README.md)。服务器为 Amazon Linux 2023 x86_64，已使用 Node.js 24 和 Caddy 部署到 `https://calling.authright.com`。下方规格是部署前的备选建议。

目标：网页显示 Vapi 电话号码；访客点击 Call 或复制号码拨打；Vapi 通话结束后通过 HTTPS Webhook 把文字转写写入 EC2 上的 SQLite。

## 推荐规格

- **EC2：t4g.medium，2 vCPU / 4 GiB RAM，Ubuntu 24.04 ARM64。**一台机器运行 Next.js、Caddy 和 SQLite，并直接在机器上构建应用。
- **磁盘：20 GiB gp3 EBS**，单实例即可。数据库放在持久目录 `/var/lib/call-authright/calls.sqlite`；定期备份数据库或制作 EBS 快照。
- 仅少量测试通话、且应用在别处构建后，可改为 **t4g.small，2 vCPU / 2 GiB RAM**。不要从 1 GiB 的 micro 开始。
- t4g 是 ARM64；创建实例时选择 ARM64 系统镜像。费用随区域、运行时长、EBS 和公网 IPv4 变化，创建前以 AWS 控制台报价为准。

## 部署顺序

1. **创建 EC2 与域名。**给实例固定公网 IP，并将一个子域名（如 `call.example.com`）的 A 记录指向它。安全组开放入站 TCP 80、443；SSH 22 只允许自己的 IP。不要对公网开放 3000。
2. **安装并启动应用。**在服务器安装 Node.js 24，上传 `app/` 的项目代码，执行 `npm ci`、`npm run build`。创建仅服务端可读的 `.env.local`，设置 `VAPI_PHONE_NUMBER=+17812096469`、`VAPI_WEBHOOK_SECRET=<随机长密钥>`、`VAPI_PRIVATE_API_KEY=<Vapi 私钥>`、`CALLS_DB_PATH=/var/lib/call-authright/calls.sqlite`。创建数据库目录并赋予运行应用的用户写权限。通过 systemd 运行 `npm run start -- -H 127.0.0.1 -p 3000`，设置开机自启。
3. **配置 Caddy。**安装 Caddy，将域名代理到本机应用：

   ```caddyfile
   call.example.com {
       reverse_proxy 127.0.0.1:3000
   }
   ```

   把示例域名替换成实际域名。DNS 已生效、80/443 可从公网访问后，Caddy 会申请并续期 HTTPS 证书。先在浏览器打开 `https://call.example.com`，确认号码及按钮正常。
4. **连接 Vapi。**在已保存的 Assistant 中将 Server URL 设置为 `https://calling.authright.com/webhooks/vapi`。为该 Server URL 选择 Custom Credential：Bearer Token、Header Name 为 `X-Vapi-Secret`、关闭 Bearer Prefix，Token 与服务器 `.env.local` 的密钥相同；保存并发布 Assistant。`end-of-call-report` 默认发送，无需单独设置。
5. **真实验证。**拨打一通电话并挂断；检查 Vapi Webhook 日志是否返回 200。在服务器的 `app/` 目录运行 `npm run calls`，确认出现双方转写。若无记录，按顺序查看 Vapi Webhook 日志、Caddy 日志、应用的 systemd 日志。

## 当前边界

- 网页和回调可以共用同一个域名与 EC2；不需要隧道或额外数据库服务。
- SQLite 文件留在这台机器的 EBS 上。重建实例、删除磁盘或更换部署目录时要保留数据库文件。
- 通话记录可通过 `https://calling.authright.com/callrecord` 查看，主页不放入口。页面的 **Refresh from Vapi** 按钮会将该号码近期已结束的入站电话同步到 SQLite，通话 ID 去重。按当前演示版要求，页面和刷新接口公开访问。
- 本地 `.env.local` 已包含号码和本地回调密钥，部署时不要提交到代码仓库或公开分享；服务器可生成新密钥，再同步设置 Vapi Credential。

## 参考

- [AWS T4g 实例规格](https://aws.amazon.com/ec2/instance-types/t4/)
- [AWS gp3 EBS](https://aws.amazon.com/ebs/general-purpose/)
- [Next.js Node.js 部署](https://nextjs.org/docs/app/getting-started/deploying)
- [Caddy 自动 HTTPS](https://caddyserver.com/docs/automatic-https)
- [Vapi Server URL](https://docs.vapi.ai/server-url/setting-server-urls)
- [Vapi Server Authentication](https://docs.vapi.ai/server-url/server-authentication)
