/**
 * 全站入口人机验证（Turnstile 大门）
 * 通过后发 24 小时通行 Cookie；验证过的搜索引擎爬虫直接放行（保 SEO）
 */
import { sha256Hex, token } from './ids';

export const GATE_COOKIE = 'blogb_gate';
export const GATE_TTL = 24 * 3600 * 1000; // 24 小时

export async function issueGate(db: D1Database): Promise<{ raw: string; expiresAt: number }> {
  const raw = token(24);
  const hash = await sha256Hex(raw);
  const expiresAt = Date.now() + GATE_TTL;
  await db.prepare('INSERT INTO gate_tokens (token_hash, expires_at) VALUES (?, ?)').bind(hash, expiresAt).run();
  return { raw, expiresAt };
}

export async function validGate(db: D1Database, raw: string): Promise<boolean> {
  if (!raw) return false;
  const hash = await sha256Hex(raw);
  const row = await db
    .prepare('SELECT token_hash FROM gate_tokens WHERE token_hash = ? AND expires_at > ? LIMIT 1')
    .bind(hash, Date.now())
    .first();
  return !!row;
}

/** 已认证的搜索引擎爬虫（Turnstile 也会自动放行，这里服务端直接跳过大门） */
const CRAWLER_RE =
  /googlebot|bingbot|baiduspider|yandex|duckduckbot|slurp|sogou|360spider|facebookexternalhit|twitterbot|applebot|bytespider|petalbot|semrushbot|ahrefsbot|mj12bot|uptimerobot/i;

export function isVerifiedCrawler(ua: string): boolean {
  return CRAWLER_RE.test(ua);
}

/** 哪些路径需要过大门（页面类；静态资源/API/验证页本身/已有独立验证的登录注册页除外） */
const GATE_EXEMPT = [
  '/gate',
  '/api/',
  '/_astro/',
  '/media/',
  '/login',
  '/register',
  '/favicon.svg',
  '/robots.txt',
  '/rss.xml',
  '/sitemap',
  '/manifest.webmanifest',
  '/icon-',
];

export function needsGate(pathname: string): boolean {
  return !GATE_EXEMPT.some((p) => pathname.startsWith(p));
}
