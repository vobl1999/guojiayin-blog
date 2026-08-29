import type { APIRoute } from 'astro';
import { env } from '../../../lib/db';

/** 更新个人资料：昵称 / 性别 / 简介 */
export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return new Response(JSON.stringify({ error: '未登录' }), { status: 401 });
  const e = env(locals.runtime);
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  const name = String(body.name ?? '').trim().slice(0, 30);
  const gender = ['male', 'female', 'other'].includes(String(body.gender ?? '')) ? String(body.gender) : null;
  const bio = String(body.bio ?? '').trim().slice(0, 200);

  await e.DB.prepare('UPDATE users SET name = ?, gender = ?, bio = ? WHERE id = ?')
    .bind(name || user.username, gender, bio, user.id)
    .run();
  return new Response(JSON.stringify({ ok: true }));
};
