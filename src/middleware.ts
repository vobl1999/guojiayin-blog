/**
 * 全站中间件：
 * 1) 从 Cookie 恢复登录态（每页可用 Astro.locals.user）
 * 2) 全站入口人机验证大门：无通行 Cookie 的页面请求 302 → /gate
 *    （静态资源/API/登录注册页/已验证爬虫豁免；开发环境与未配置 Turnstile 时关闭）
 */
import { defineMiddleware } from 'astro:middleware';
import { env } from './lib/db';
import { SESSION_COOKIE, userBySession } from './lib/session';
import { GATE_COOKIE, needsGate, validGate, isVerifiedCrawler } from './lib/gate';

export const onRequest = defineMiddleware(async (context, next) => {
  const e = env(context.locals.runtime);

  // 登录态
  const raw = context.cookies.get(SESSION_COOKIE)?.value;
  context.locals.user = raw ? await userBySession(e.DB, raw) : null;

  // 入口大门
  const url = new URL(context.request.url);
  const isPageNav =
    context.request.method === 'GET' &&
    (context.request.headers.get('accept') ?? '').includes('text/html') &&
    !url.pathname.startsWith('/_astro/');
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

  return next();
});
