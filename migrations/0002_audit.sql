-- 审计日志 + 登录限流
-- 执行：npm run db:migrate:remote（迁移文件需手动加进 migrate 脚本或用 wrangler 直接执行）

CREATE TABLE IF NOT EXISTS audit_logs (
  id         TEXT PRIMARY KEY,
  encrypted  TEXT NOT NULL,           -- iv.cipher.vobl（AES-256-GCM，密钥 AUDIT_KEY）
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

CREATE TABLE IF NOT EXISTS login_attempts (
  id         TEXT PRIMARY KEY,
  email      TEXT NOT NULL,
  ip         TEXT NOT NULL,
  success    INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_attempts_email ON login_attempts(email, created_at);
CREATE INDEX IF NOT EXISTS idx_attempts_ip ON login_attempts(ip, created_at);
