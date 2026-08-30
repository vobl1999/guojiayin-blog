import type { APIRoute } from 'astro';
import { env } from '../../../lib/db';
import { renderMarkdown, makeExcerpt } from '../../../lib/markdown';
import { slugify, uid } from '../../../lib/ids';
import { audit, clientMeta } from '../../../lib/audit';

function requireAdmin(locals: App.Locals) {
  const user = locals.user;
  if (!user) return { ok: false as const, res: new Response(JSON.stringify({ error: '未登录' }), { status: 401 }) };
  if (user.role !== 'admin') return { ok: false as const, res: new Response(JSON.stringify({ error: '无权限' }), { status: 403 }) };
  return { ok: true as const, user };
}

/** 创建 / 更新文章 */
export const POST: APIRoute = async ({ request, locals }) => {
  const guard = requireAdmin(locals);
  if (!guard.ok) return guard.res;
  const e = env(locals.runtime);
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  const title = String(body.title ?? '').trim();
  const content = String(body.content ?? '');
  const status = body.status === 'published' ? 'published' : 'draft';
  const tags = Array.isArray(body.tags) ? body.tags.map((t: unknown) => String(t).trim().slice(0, 30)).filter(Boolean).slice(0, 8) : [];
  const id = body.id ? String(body.id) : null;

  if (!title) return new Response(JSON.stringify({ error: '标题不能为空。' }), { status: 400 });
  if (content.trim().length < 2) return new Response(JSON.stringify({ error: '正文不能为空。' }), { status: 400 });

  const html = renderMarkdown(content);
  const excerpt = makeExcerpt(html, 140);
  const now = Date.now();

  if (id) {
    const existing = await e.DB.prepare('SELECT id FROM posts WHERE id = ?').bind(id).first();
    if (!existing) return new Response(JSON.stringify({ error: '文章不存在。' }), { status: 404 });
    await e.DB.prepare(
      `UPDATE posts SET title = ?, content_md = ?, content_html = ?, excerpt = ?, tags = ?, status = ?, updated_at = ?,
       published_at = CASE WHEN ? = 'published' THEN COALESCE(published_at, ?) ELSE published_at END
       WHERE id = ?`
    )
      .bind(title, content, html, excerpt, JSON.stringify(tags), status, now, status, now, id)
      .run();
    await audit(e, guard.user.id, 'post.update', { id, status, title: title.slice(0, 60) }, clientMeta(request));
    return new Response(JSON.stringify({ ok: true, id }));
  }

  let slug = slugify(String(body.slug ?? '').trim()) || slugify(title);
  const dup = await e.DB.prepare('SELECT id FROM posts WHERE slug = ?').bind(slug).first();
  if (dup) slug = `${slug}-${uid('s', 3).slice(2)}`;

  const postId = uid('p');
  await e.DB.prepare(
    `INSERT INTO posts (id, slug, title, content_md, content_html, excerpt, tags, status, author_id, created_at, updated_at, published_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(postId, slug, title, content, html, excerpt, JSON.stringify(tags), status, guard.user.id, now, now, status === 'published' ? now : null)
    .run();
  await audit(e, guard.user.id, 'post.create', { id: postId, slug, status, title: title.slice(0, 60) }, clientMeta(request));
  return new Response(JSON.stringify({ ok: true, id: postId, slug }));
};

/** 删除文章 */
export const DELETE: APIRoute = async ({ request, locals }) => {
  const guard = requireAdmin(locals);
  if (!guard.ok) return guard.res;
  const e = env(locals.runtime);
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const id = String(body.id ?? '');

  const post = await e.DB.prepare('SELECT cover_key FROM posts WHERE id = ?').bind(id).first<{ cover_key: string | null }>();
  if (!post) return new Response(JSON.stringify({ error: '文章不存在。' }), { status: 404 });

  if (post.cover_key) await e.BUCKET.delete(post.cover_key).catch(() => {});
  await e.DB.prepare('DELETE FROM comments WHERE post_id = ?').bind(id).run();
  await e.DB.prepare('DELETE FROM posts WHERE id = ?').bind(id).run();
  await audit(e, guard.user.id, 'post.delete', { id }, clientMeta(request));
  return new Response(JSON.stringify({ ok: true }));
};
