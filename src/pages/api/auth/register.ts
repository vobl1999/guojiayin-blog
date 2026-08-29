import type { APIRoute } from 'astro';
import { env } from '../../../lib/db';
import { hashPassword } from '../../../lib/auth';
import { createSession, SESSION_COOKIE, sweepSessions } from '../../../lib/session';
import { sendVerifyCode } from '../../../lib/mail';
import { EMAIL_RE, USERNAME_RE, uid } from '../../../lib/ids';

const CODE_TTL = 10 * 60 * 1000; // 10 分钟
const RESEND_GAP = 60 * 1000; // 60 秒
const HOURLY_LIMIT = 5;

function genCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export const POST: APIRoute = async ({ request, locals, cookies }) => {
  const e = env(locals.runtime);
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const email = String(body.email ?? '').trim().toLowerCase();
  const step = String(body.step ?? 'send');

  if (!EMAIL_RE.test(email)) {
    return new Response(JSON.stringify({ error: '邮箱格式不正确。' }), { status: 400 });
  }

  const existing = await e.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (existing) {
    return new Response(JSON.stringify({ error: '这个邮箱已经注册过了，直接登录吧。' }), { status: 409 });
  }

  if (step === 'send') {
    // 频率限制
    const recent = await e.DB.prepare(
      `SELECT COUNT(*) AS n FROM verify_codes WHERE email = ? AND purpose = 'register' AND created_at > ?`
    )
      .bind(email, Date.now() - RESEND_GAP)
      .first<{ n: number }>();
    if ((recent?.n ?? 0) > 0) {
      return new Response(JSON.stringify({ error: '发送太频繁，请 1 分钟后再试。' }), { status: 429 });
    }
    const hourly = await e.DB.prepare(
      `SELECT COUNT(*) AS n FROM verify_codes WHERE email = ? AND purpose = 'register' AND created_at > ?`
    )
      .bind(email, Date.now() - 3600_000)
      .first<{ n: number }>();
    if ((hourly?.n ?? 0) >= HOURLY_LIMIT) {
      return new Response(JSON.stringify({ error: '发送次数过多，请 1 小时后再试。' }), { status: 429 });
    }

    const code = genCode();
    const now = Date.now();
    await e.DB.prepare(
      `INSERT INTO verify_codes (id, email, code, purpose, expires_at, created_at) VALUES (?, ?, ?, 'register', ?, ?)`
    )
      .bind(uid('vc'), email, code, now + CODE_TTL, now)
      .run();

    const sent = await sendVerifyCode(e, email, code, 'register');
    if (!sent.ok) {
      return new Response(
        JSON.stringify({ error: `邮件发送失败：${sent.error}（请检查 SMTP 配置）` }),
        { status: 500 }
      );
    }
    return new Response(JSON.stringify({ ok: true, dev: sent.dev ?? false }));
  }

  if (step === 'verify') {
    const username = String(body.username ?? '').trim();
    const password = String(body.password ?? '');
    const code = String(body.code ?? '').trim();

    if (!USERNAME_RE.test(username)) {
      return new Response(JSON.stringify({ error: '用户名需为 3-20 位字母、数字或下划线。' }), { status: 400 });
    }
    if (password.length < 8) {
      return new Response(JSON.stringify({ error: '密码至少 8 位。' }), { status: 400 });
    }
    const dup = await e.DB.prepare('SELECT id FROM users WHERE username = ?').bind(username).first();
    if (dup) {
      return new Response(JSON.stringify({ error: '这个用户名已被占用。' }), { status: 409 });
    }

    const row = await e.DB.prepare(
      `SELECT * FROM verify_codes WHERE email = ? AND purpose = 'register' AND consumed = 0 AND expires_at > ?
       ORDER BY created_at DESC LIMIT 1`
    )
      .bind(email, Date.now())
      .first<{ id: string; code: string }>();
    if (!row || row.code !== code) {
      return new Response(JSON.stringify({ error: '验证码错误或已过期。' }), { status: 400 });
    }
    await e.DB.prepare(`UPDATE verify_codes SET consumed = 1 WHERE id = ?`).bind(row.id).run();

    const { hash, salt } = await hashPassword(password);
    const userId = uid('u');
    const now = Date.now();
    await e.DB.prepare(
      `INSERT INTO users (id, email, password_hash, password_salt, username, name, email_verified, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?)`
    )
      .bind(userId, email, hash, salt, username, username, now)
      .run();

    await sweepSessions(e.DB);
    const { raw } = await createSession(e.DB, userId);
    cookies.set(SESSION_COOKIE, raw, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: !import.meta.env.DEV,
      maxAge: 30 * 86400,
    });

    return new Response(JSON.stringify({ ok: true }));
  }

  return new Response(JSON.stringify({ error: '无效请求。' }), { status: 400 });
};
