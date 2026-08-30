import type { APIRoute } from 'astro';
import { env } from '../../lib/db';
import { verifyTurnstile } from '../../lib/turnstile';
import { clientMeta } from '../../lib/audit';
import { GATE_COOKIE, GATE_TTL, issueGate } from '../../lib/gate';

/** 入口验证：校验 Turnstile token → 签发 24 小时通行 Cookie */
export const POST: APIRoute = async ({ request, locals, cookies }) => {
  const e = env(locals.runtime);
  const meta = clientMeta(request);
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const cfToken = String(body.cfToken ?? '');

  const ok = await verifyTurnstile(e, cfToken, meta.ip);
  if (!ok) {
    return new Response(JSON.stringify({ error: '人机验证未通过，请重试。' }), { status: 400 });
  }

  const { raw } = await issueGate(e.DB);
  cookies.set(GATE_COOKIE, raw, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: !import.meta.env.DEV,
    maxAge: Math.floor(GATE_TTL / 1000),
  });
  return new Response(JSON.stringify({ ok: true }));
};
