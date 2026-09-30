import { existsSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const filePath = path.resolve(process.cwd(), process.env.CALLS_DB_PATH || "./data/calls.sqlite");
if (!existsSync(filePath)) {
  console.log("还没有保存的通话。数据库位置：" + filePath);
  process.exit(0);
}

const db = new DatabaseSync(filePath, { readOnly: true });
try {
  const calls = db.prepare(`
    SELECT vapi_call_id, started_at, ended_at, ended_reason,
           transcript, transcript_status, received_at
    FROM calls ORDER BY received_at DESC LIMIT 10
  `).all();

  if (calls.length === 0) {
    console.log("还没有保存的通话。");
  }

  for (const call of calls) {
    console.log("\n" + "=".repeat(60));
    console.log("通话 ID：" + call.vapi_call_id);
    console.log("开始时间：" + (call.started_at || "未知"));
    console.log("结束时间：" + (call.ended_at || "未知"));
    console.log("结束原因：" + (call.ended_reason || "未知"));
    console.log("转写状态：" + call.transcript_status);
    console.log("\n" + (call.transcript || "暂无转写内容"));
  }
} finally {
  db.close();
}
