# Call Authright 线上部署

## 当前环境

- 地址：`https://calling.authright.com`
- EC2：Amazon Linux 2023，x86_64，约 4 GiB 内存，20 GiB 根磁盘
- 应用：`/opt/call-authright/app`，Node.js 24，systemd 服务 `call-authright`
- 反向代理：Caddy，配置 `/etc/caddy/Caddyfile`，systemd 服务 `caddy`
- SQLite：`/var/lib/call-authright/calls.sqlite`
- 服务端密钥：`/opt/call-authright/app/.env.local`，不要提交到 Git

首页和 `/callrecord` 均由 Caddy 提供 HTTPS。按当前演示版要求，`/callrecord` 公开访问。应用只监听 `127.0.0.1:3000`；公网无需开放 3000 端口。

## 已生效的 Vapi 配置

号码 `+17812096469` 绑定的 Assistant 已在 **Advanced → Webhook Server** 配置：

1. Server URL：`https://calling.authright.com/webhooks/vapi`
2. Authorization：创建并选择 Bearer Token Custom Credential。Header Name 为 `X-Vapi-Secret`，关闭 Bearer Prefix，Token 与服务器 `.env.local` 中的 `VAPI_WEBHOOK_SECRET` 相同。
3. Assistant 已保存并发布。`end-of-call-report` 是 Vapi 默认发送的 Server Message，无需单独设置。

过去的通话可在 `/callrecord` 点击 **Refresh from Vapi** 拉取；相同 Vapi call ID 只存一条。

## 验证结果（2026-09-29）

- 首页和 `/callrecord` 均通过公网 HTTPS 正常访问。
- 用户完成了真实来电测试，确认挂断后转写自动保存并在记录页显示。
- 线上 SQLite 核对到 3 条通话记录，3 条都有转写。
- 手动从 Vapi 刷新成功；对同一通话再次刷新返回 `unchanged: 1`，没有重复写入。
- Webhook 无密钥请求返回 401，使用服务器密钥的测试事件返回 200。

## 运维检查

```bash
sudo systemctl status call-authright caddy
sudo journalctl -u call-authright -n 100 --no-pager
sudo journalctl -u caddy -n 100 --no-pager
cd /opt/call-authright/app && npm run calls
```

更新代码时重新上传 `app/`、运行 `npm ci` 与 `npm run build`，然后 `sudo systemctl restart call-authright`。保留服务器上的 `.env.local` 和 `/var/lib/call-authright/calls.sqlite`。定期备份 SQLite 文件或制作 EBS 快照。
