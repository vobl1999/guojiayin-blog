import type { APIRoute } from 'astro';
import { env } from '../../../lib/db';
import { audit, clientMeta } from '../../../lib/audit';

/** 用户管理：ban / unban / delete（不能对自己操作） */
export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user || locals.user.role !== 'admin') {
    return new Response(JSON.stringify({ error: '无权限' }), { status: 403 });
  }
  const e = env(locals.runtime);
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const id = String(body.id ?? '');
  const action = String(body.action ?? '');

  if (id === locals.user.id) {
    return new Response(JSON.stringify({ error: '不能对自己操作。' }), { status: 400 });
  }
  const target = await e.DB.prepare('SELECT id, role, avatar_key FROM users WHERE id = ?').bind(id).first<{ id: string; role: string; avatar_key: string | null }>();
  if (!target) return new Response(JSON.stringify({ error: '用户不存在。' }), { status: 404 });
  if (target.role === 'admin' && action !== 'delete') {
    return new Response(JSON.stringify({ error: '不能操作其他管理员。' }), { status: 403 });
  }

  if (action === 'ban') {
    await e.DB.prepare(`UPDATE users SET role = 'banned' WHERE id = ?`).bind(id).run();
    await e.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(id).run();
  } else if (action === 'unban') {
    await e.DB.prepare(`UPDATE users SET role = 'user' WHERE id = ?`).bind(id).run();
  } else if (action === 'delete') {
    if (target.avatar_key) await e.BUCKET.delete(target.avatar_key).catch(() => {});
    await e.DB.prepare('DELETE FROM comments WHERE user_id = ?').bind(id).run();
    await e.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(id).run();
    // 用户文章改为不可见（保留作者痕迹：把作者归属设为站长）
    await e.DB.prepare(`UPDATE posts SET author_id = ? WHERE author_id = ?`).bind(locals.user.id, id).run();
    await e.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
  } else {
    return new Response(JSON.stringify({ error: '无效操作。' }), { status: 400 });
  }
  audit(e, locals.user.id, `user.${action}`, { target: id }, clientMeta(request));
  return new Response(JSON.stringify({ ok: true }));
};
