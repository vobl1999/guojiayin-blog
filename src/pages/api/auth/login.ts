import type { APIRoute } from 'astro';
import { env } from '../../../lib/db';
import { verifyPassword } from '../../../lib/auth';
import { createSession, SESSION_COOKIE, sweepSessions } from '../../../lib/session';
import { sendVerifyCode } from '../../../lib/mail';
import { EMAIL_RE, uid } from '../../../lib/ids';
import { verifyTurnstile } from '../../../lib/turnstile';
import { audit, clientMeta } from '../../../lib/audit';

const CODE_TTL = 10 * 60 * 1000;
const RESEND_GAP = 60 * 1000;
const GENERIC = '邮箱或密码不正确。';
const MAX_FAILS = 5; // 15 分钟内最多 5 次失败（防爆破/DDOS）
const FAIL_WINDOW = 15 * 60 * 1000;

function genCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function fail(body: string, status = 401): Response {
  return new Response(JSON.stringify({ error: body }), { status });
}

export const POST: APIRoute = async ({ request, locals, cookies }) => {
  const e = env(locals.runtime);
  const meta = clientMeta(request);
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const mode = String(body.mode ?? 'password');
  const email = String(body.email ?? '').trim().toLowerCase();

  // 状态码统一：任何"认不出你是谁"的情况都返回 401 + 同一句话，不泄露邮箱是否注册
  if (!EMAIL_RE.test(email)) {
    return fail(GENERIC);
  }

  // 人机验证（未配置 TURNSTILE_SECRET 时放行，本地开发）
  const cfOk = await verifyTurnstile(e, String(body.cfToken ?? ''), meta.ip);
  if (!cfOk) {
    return fail('人机验证未通过，请重试。', 400);
  }

  // 限流：该邮箱或该 IP 近 15 分钟失败 ≥5 次 → 拒绝
  const recentFails = await e.DB.prepare(
    `SELECT COUNT(*) AS n FROM login_attempts WHERE success = 0 AND created_at > ? AND (email = ? OR ip = ?)`
  )
    .bind(Date.now() - FAIL_WINDOW, email, meta.ip ?? '-')
    .first<{ n: number }>();
  if ((recentFails?.n ?? 0) >= MAX_FAILS) {
    audit(e, null, 'login.blocked', { email }, meta);
    return fail('尝试次数过多，请 15 分钟后再试。', 429);
  }

  const recordAttempt = (success: boolean) =>
    e.DB.prepare('INSERT INTO login_attempts (id, email, ip, success, created_at) VALUES (?, ?, ?, ?, ?)')
      .bind(uid('la'), email, meta.ip ?? '-', success ? 1 : 0, Date.now())
      .run();

  const user = await e.DB.prepare(
    'SELECT id, email, password_hash, password_salt, role FROM users WHERE email = ?'
  )
    .bind(email)
    .first<{ id: string; email: string; password_hash: string; password_salt: string; role: string }>();

  if (!user) {
    await recordAttempt(false);
    audit(e, null, 'login.fail', { email, reason: 'unknown-email', mode }, meta);
    return fail(GENERIC);
  }
  if (user.role === 'banned') {
    audit(e, user.id, 'login.fail', { reason: 'banned' }, meta);
    return fail('账号已被封禁。', 403);
  }

  const finish = async (userId: string) => {
    await recordAttempt(true);
    await sweepSessions(e.DB);
    const { raw } = await createSession(e.DB, userId);
    cookies.set(SESSION_COOKIE, raw, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: !import.meta.env.DEV,
      maxAge: 30 * 86400,
    });
    audit(e, userId, 'login.success', { mode }, meta);
    return new Response(JSON.stringify({ ok: true }));
  };

  if (mode === 'password') {
    const password = String(body.password ?? '');
    const ok = await verifyPassword(password, user.password_salt, user.password_hash);
    if (!ok) {
      await recordAttempt(false);
      audit(e, user.id, 'login.fail', { reason: 'bad-password' }, meta);
      return fail(GENERIC);
    }
    return finish(user.id);
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
        return fail('发送太频繁，请 1 分钟后再试。', 429);
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
        return fail(`邮件发送失败：${sent.error}（请检查 SMTP 配置）`, 500);
      }
      audit(e, user.id, 'login.code-sent', {}, meta);
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
        await recordAttempt(false);
        audit(e, user.id, 'login.fail', { reason: 'bad-code' }, meta);
        return fail(GENERIC);
      }
      await e.DB.prepare(`UPDATE verify_codes SET consumed = 1 WHERE id = ?`).bind(row.id).run();
      return finish(user.id);
    }
  }

  return fail(GENERIC);
};
