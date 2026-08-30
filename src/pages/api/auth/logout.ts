import type { APIRoute } from 'astro';
import { env } from '../../../lib/db';
import { destroySession, SESSION_COOKIE } from '../../../lib/session';
import { audit, clientMeta } from '../../../lib/audit';

export const POST: APIRoute = async ({ request, locals, cookies }) => {
  const e = env(locals.runtime);
  const raw = cookies.get(SESSION_COOKIE)?.value;
  if (raw) await destroySession(e.DB, raw);
  if (locals.user) audit(e, locals.user.id, 'logout', {}, clientMeta(request));
  cookies.delete(SESSION_COOKIE, { path: '/' });
  return new Response(JSON.stringify({ ok: true }));
};
