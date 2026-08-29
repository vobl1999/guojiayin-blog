import type { APIRoute } from 'astro';
import { env } from '../../../lib/db';
import { destroySession, SESSION_COOKIE } from '../../../lib/session';

export const POST: APIRoute = async ({ locals, cookies }) => {
  const e = env(locals.runtime);
  const raw = cookies.get(SESSION_COOKIE)?.value;
  if (raw) await destroySession(e.DB, raw);
  cookies.delete(SESSION_COOKIE, { path: '/' });
  return new Response(JSON.stringify({ ok: true }));
};
