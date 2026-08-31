-- 站点数据统计：页面访问埋点
CREATE TABLE IF NOT EXISTS page_views (
  id         TEXT PRIMARY KEY,
  path       TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pv_created ON page_views(created_at);
