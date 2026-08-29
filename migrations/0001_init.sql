-- 博客数据库初始 schema（blog.vobl.cn）
-- 执行：npm run db:migrate:remote

CREATE TABLE IF NOT EXISTS users (
  id           TEXT PRIMARY KEY,
  email        TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  username     TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL DEFAULT '',
  gender       TEXT,                          -- 'male' | 'female' | 'other' | NULL
  avatar_key   TEXT,                          -- R2 key
  bio          TEXT NOT NULL DEFAULT '',
  role         TEXT NOT NULL DEFAULT 'user',  -- 'admin' | 'user'
  email_verified INTEGER NOT NULL DEFAULT 0,
  created_at   INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS verify_codes (
  id         TEXT PRIMARY KEY,
  email      TEXT NOT NULL,
  code       TEXT NOT NULL,
  purpose    TEXT NOT NULL,          -- 'register' | 'login'
  expires_at INTEGER NOT NULL,
  consumed   INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_vc_email ON verify_codes(email, purpose);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS posts (
  id           TEXT PRIMARY KEY,
  slug         TEXT NOT NULL UNIQUE,
  title        TEXT NOT NULL,
  content_md   TEXT NOT NULL,
  content_html TEXT NOT NULL,
  excerpt      TEXT NOT NULL DEFAULT '',
  cover_key    TEXT,                          -- R2 key（可选封面）
  tags         TEXT NOT NULL DEFAULT '[]',    -- JSON 数组
  status       TEXT NOT NULL DEFAULT 'draft', -- 'draft' | 'published'
  author_id    TEXT NOT NULL,
  views        INTEGER NOT NULL DEFAULT 0,
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL,
  published_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status, published_at);

CREATE TABLE IF NOT EXISTS comments (
  id         TEXT PRIMARY KEY,
  post_id    TEXT NOT NULL,
  user_id    TEXT NOT NULL,
  parent_id  TEXT,                     -- 回复的父评论 id（NULL = 顶层）
  content    TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'visible',  -- 'visible' | 'hidden'
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id, created_at);
