/**
 * 全站中间件：从 Cookie 恢复登录态（每页可用 Astro.locals.user）
 */
import { defineMiddleware } from 'astro:middleware';
import { env } from './lib/db';
import { SESSION_COOKIE, userBySession } from './lib/session';

export const onRequest = defineMiddleware(async (context, next) => {
  const e = env(context.locals.runtime);
  const raw = context.cookies.get(SESSION_COOKIE)?.value;
  context.locals.user = raw ? await userBySession(e.DB, raw) : null;
  return next();
});
