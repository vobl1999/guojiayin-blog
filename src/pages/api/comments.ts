import type { APIRoute } from 'astro';
import { env } from '../../lib/db';
import { uid } from '../../lib/ids';

/** 评论：POST 发表 / DELETE 删除（本人或管理员） */
export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return new Response(JSON.stringify({ error: '请先登录。' }), { status: 401 });
  if (user.role === 'banned') return new Response(JSON.stringify({ error: '账号已被封禁。' }), { status: 403 });

  const e = env(locals.runtime);
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const postId = String(body.postId ?? '');
  const parentId = body.parentId ? String(body.parentId) : null;
  const content = String(body.content ?? '').trim().slice(0, 2000);

  if (!content) return new Response(JSON.stringify({ error: '评论内容不能为空。' }), { status: 400 });
  if (content.length < 2) return new Response(JSON.stringify({ error: '评论太短了。' }), { status: 400 });

  const post = await e.DB.prepare(`SELECT id, status FROM posts WHERE id = ?`).bind(postId).first();
  if (!post || String(post.status) !== 'published') {
    return new Response(JSON.stringify({ error: '文章不存在或未发布。' }), { status: 404 });
  }

  if (parentId) {
    const parent = await e.DB.prepare(`SELECT id, post_id FROM comments WHERE id = ?`).bind(parentId).first();
    if (!parent || String(parent.post_id) !== postId) {
      return new Response(JSON.stringify({ error: '回复目标不存在。' }), { status: 400 });
    }
  }

  const now = Date.now();
  const id = uid('c');
  await e.DB.prepare(
    `INSERT INTO comments (id, post_id, user_id, parent_id, content, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'visible', ?, ?)`
  )
    .bind(id, postId, user.id, parentId, content, now, now)
    .run();

  return new Response(JSON.stringify({ ok: true, id }));
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return new Response(JSON.stringify({ error: '请先登录。' }), { status: 401 });
  const e = env(locals.runtime);
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const id = String(body.id ?? '');

  const comment = await e.DB.prepare('SELECT id, user_id FROM comments WHERE id = ?').bind(id).first<{ id: string; user_id: string }>();
  if (!comment) return new Response(JSON.stringify({ error: '评论不存在。' }), { status: 404 });
  if (user.role !== 'admin' && comment.user_id !== user.id) {
    return new Response(JSON.stringify({ error: '无权删除。' }), { status: 403 });
  }

  await e.DB.prepare(`DELETE FROM comments WHERE id = ?`).bind(id).run();
  await e.DB.prepare(`DELETE FROM comments WHERE parent_id = ?`).bind(id).run(); // 连同回复
  return new Response(JSON.stringify({ ok: true }));
};
