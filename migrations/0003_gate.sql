-- 全站入口人机验证通行 token
CREATE TABLE IF NOT EXISTS gate_tokens (
  token_hash TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL
);
