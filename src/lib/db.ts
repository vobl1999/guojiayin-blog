/**
 * 博客数据库访问层（Cloudflare D1，经 Astro Cloudflare adapter 的绑定注入）
 */
export interface DBEnv {
  DB: D1Database;
  BUCKET: R2Bucket;
  SESSION_SECRET?: string;
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  SMTP_FROM?: string;
  SITE_URL?: string;
  AUDIT_KEY?: string;
  TURNSTILE_SITEKEY?: string;
  TURNSTILE_SECRET?: string;
}

export function env(runtime: App.Locals['runtime']): DBEnv {
  return runtime.env as unknown as DBEnv;
}
