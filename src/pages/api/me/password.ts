import type { APIRoute } from 'astro';
import { env } from '../../../lib/db';
import { hashPassword, verifyPassword } from '../../../lib/auth';

/** 修改密码 */
export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return new Response(JSON.stringify({ error: '未登录' }), { status: 401 });
  const e = env(locals.runtime);
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const oldPw = String(body.old ?? '');
  const nextPw = String(body.next ?? '');

  if (nextPw.length < 8) {
    return new Response(JSON.stringify({ error: '新密码至少 8 位。' }), { status: 400 });
  }
  const row = await e.DB.prepare('SELECT password_hash, password_salt FROM users WHERE id = ?')
    .bind(user.id)
    .first<{ password_hash: string; password_salt: string }>();
  if (!row || !(await verifyPassword(oldPw, row.password_salt, row.password_hash))) {
    return new Response(JSON.stringify({ error: '当前密码不正确。' }), { status: 400 });
  }

  const { hash, salt } = await hashPassword(nextPw);
  await e.DB.prepare('UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?')
    .bind(hash, salt, user.id)
    .run();
  return new Response(JSON.stringify({ ok: true }));
};
