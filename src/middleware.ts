/**
 * 全站中间件：
 * 1) 从 Cookie 恢复登录态（每页可用 Astro.locals.user）
 * 2) 全站入口人机验证大门：无通行 Cookie 的页面请求 302 → /gate
 *    （静态资源/API/登录注册页/已验证爬虫豁免；开发环境与未配置 Turnstile 时关闭）
 * 3) 站点数据埋点：HTML 页面访问写入 page_views（/stats 实时线型图的数据源）
 */
import { defineMiddleware } from 'astro:middleware';
import { env } from './lib/db';
import { SESSION_COOKIE, userBySession } from './lib/session';
import { GATE_COOKIE, needsGate, validGate, isVerifiedCrawler } from './lib/gate';

const NO_TRACK = ['/_astro', '/media/', '/api/', '/gate', '/favicon.svg'];

export const onRequest = defineMiddleware(async (context, next) => {
  const e = env(context.locals.runtime);
  const url = new URL(context.request.url);

  // 登录态
  const raw = context.cookies.get(SESSION_COOKIE)?.value;
  context.locals.user = raw ? await userBySession(e.DB, raw) : null;

  const isPageNav =
    context.request.method === 'GET' &&
    (context.request.headers.get('accept') ?? '').includes('text/html') &&
    !url.pathname.startsWith('/_astro/');

  // 入口大门
  const gateOn = !!e.TURNSTILE_SECRET && !import.meta.env.DEV;
  if (
    gateOn &&
    isPageNav &&
    needsGate(url.pathname) &&
    !isVerifiedCrawler(context.request.headers.get('user-agent') ?? '')
  ) {
    const gateToken = context.cookies.get(GATE_COOKIE)?.value;
    if (!gateToken || !(await validGate(e.DB, gateToken))) {
      const next = url.pathname === '/gate' ? '/' : url.pathname + url.search;
      return context.redirect(`/gate?next=${encodeURIComponent(next)}`, 302);
    }
  }

  // 站点数据埋点（真实页面访问，爬虫也计入但无需担心，统计口径一致）
  if (isPageNav && !NO_TRACK.some((p) => url.pathname.startsWith(p))) {
    await e.DB.prepare('INSERT INTO page_views (id, path, created_at) VALUES (?, ?, ?)')
      .bind(`pv_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`, url.pathname, Date.now())
      .run()
      .catch(() => {});
  }

  return next();
});
