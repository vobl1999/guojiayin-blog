import type { APIRoute } from 'astro';
import { env } from '../../../lib/db';
import { verifyPassword } from '../../../lib/auth';
import { createSession, SESSION_COOKIE, sweepSessions } from '../../../lib/session';
import { sendVerifyCode } from '../../../lib/mail';
import { EMAIL_RE, uid } from '../../../lib/ids';

const CODE_TTL = 10 * 60 * 1000;
const RESEND_GAP = 60 * 1000;

function genCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export const POST: APIRoute = async ({ request, locals, cookies }) => {
  const e = env(locals.runtime);
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const mode = String(body.mode ?? 'password');
  const email = String(body.email ?? '').trim().toLowerCase();

  if (!EMAIL_RE.test(email)) {
    return new Response(JSON.stringify({ error: '邮箱格式不正确。' }), { status: 400 });
  }

  const user = await e.DB.prepare(
    'SELECT id, email, password_hash, password_salt, role FROM users WHERE email = ?'
  )
    .bind(email)
    .first<{ id: string; email: string; password_hash: string; password_salt: string; role: string }>();

  if (!user) {
    return new Response(JSON.stringify({ error: '这个邮箱还没有注册。' }), { status: 404 });
  }
  if (user.role === 'banned') {
    return new Response(JSON.stringify({ error: '账号已被封禁。' }), { status: 403 });
  }

  const finish = async () => {
    await sweepSessions(e.DB);
    const { raw } = await createSession(e.DB, user.id);
    cookies.set(SESSION_COOKIE, raw, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: !import.meta.env.DEV,
      maxAge: 30 * 86400,
    });
    return new Response(JSON.stringify({ ok: true }));
  };

  if (mode === 'password') {
    const password = String(body.password ?? '');
    const ok = await verifyPassword(password, user.password_salt, user.password_hash);
    if (!ok) {
      return new Response(JSON.stringify({ error: '邮箱或密码不正确。' }), { status: 401 });
    }
    return finish();
  }

  if (mode === 'code') {
    const step = String(body.step ?? 'send');
    if (step === 'send') {
      const recent = await e.DB.prepare(
        `SELECT COUNT(*) AS n FROM verify_codes WHERE email = ? AND purpose = 'login' AND created_at > ?`
      )
        .bind(email, Date.now() - RESEND_GAP)
        .first<{ n: number }>();
      if ((recent?.n ?? 0) > 0) {
        return new Response(JSON.stringify({ error: '发送太频繁，请 1 分钟后再试。' }), { status: 429 });
      }
      const code = genCode();
      const now = Date.now();
      await e.DB.prepare(
        `INSERT INTO verify_codes (id, email, code, purpose, expires_at, created_at) VALUES (?, ?, ?, 'login', ?, ?)`
      )
        .bind(uid('vc'), email, code, now + CODE_TTL, now)
        .run();
      const sent = await sendVerifyCode(e, email, code, 'login');
      if (!sent.ok) {
        return new Response(
          JSON.stringify({ error: `邮件发送失败：${sent.error}（请检查 SMTP 配置）` }),
          { status: 500 }
        );
      }
      return new Response(JSON.stringify({ ok: true, dev: sent.dev ?? false }));
    }

    if (step === 'verify') {
      const code = String(body.code ?? '').trim();
      const row = await e.DB.prepare(
        `SELECT * FROM verify_codes WHERE email = ? AND purpose = 'login' AND consumed = 0 AND expires_at > ?
         ORDER BY created_at DESC LIMIT 1`
      )
        .bind(email, Date.now())
        .first<{ id: string; code: string }>();
      if (!row || row.code !== code) {
        return new Response(JSON.stringify({ error: '验证码错误或已过期。' }), { status: 400 });
      }
      await e.DB.prepare(`UPDATE verify_codes SET consumed = 1 WHERE id = ?`).bind(row.id).run();
      return finish();
    }
  }

  return new Response(JSON.stringify({ error: '无效请求。' }), { status: 400 });
};
