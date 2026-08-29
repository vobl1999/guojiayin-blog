import type { APIRoute } from 'astro';
import { env } from '../../../lib/db';

/** 评论管理：hide / show / delete */
export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user || locals.user.role !== 'admin') {
    return new Response(JSON.stringify({ error: '无权限' }), { status: 403 });
  }
  const e = env(locals.runtime);
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const id = String(body.id ?? '');
  const action = String(body.action ?? '');

  if (action === 'hide') {
    await e.DB.prepare(`UPDATE comments SET status = 'hidden' WHERE id = ?`).bind(id).run();
  } else if (action === 'show') {
    await e.DB.prepare(`UPDATE comments SET status = 'visible' WHERE id = ?`).bind(id).run();
  } else if (action === 'delete') {
    await e.DB.prepare('DELETE FROM comments WHERE id = ?').bind(id).run();
    await e.DB.prepare('DELETE FROM comments WHERE parent_id = ?').bind(id).run();
  } else {
    return new Response(JSON.stringify({ error: '无效操作。' }), { status: 400 });
  }
  return new Response(JSON.stringify({ ok: true }));
};
