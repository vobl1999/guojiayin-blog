import type { APIRoute } from 'astro';
import { env } from '../../../../lib/db';
import { uid } from '../../../../lib/ids';

const MAX_SIZE = 4 * 1024 * 1024;
const ALLOWED: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
};

/** 上传文章封面到 R2（multipart：cover 文件 + id 文章） */
export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user || locals.user.role !== 'admin') {
    return new Response(JSON.stringify({ error: '无权限' }), { status: 403 });
  }
  const e = env(locals.runtime);
  const form = await request.formData().catch(() => null);
  const file = form?.get('cover');
  const id = String(form?.get('id') ?? '');
  if (!(file instanceof File) || !id) {
    return new Response(JSON.stringify({ error: '缺少文件或文章 id。' }), { status: 400 });
  }
  const ext = ALLOWED[file.type];
  if (!ext) return new Response(JSON.stringify({ error: '仅支持 JPG/PNG/WebP/AVIF。' }), { status: 400 });
  if (file.size > MAX_SIZE) return new Response(JSON.stringify({ error: '封面不能超过 4MB。' }), { status: 400 });

  const post = await e.DB.prepare('SELECT cover_key FROM posts WHERE id = ?').bind(id).first<{ cover_key: string | null }>();
  if (!post) return new Response(JSON.stringify({ error: '文章不存在。' }), { status: 404 });

  const key = `covers/${id}_${uid('c', 6).slice(2)}.${ext}`;
  await e.BUCKET.put(key, file.stream(), {
    httpMetadata: { contentType: file.type, cacheControl: 'public, max-age=31536000, immutable' },
  });
  if (post.cover_key) await e.BUCKET.delete(post.cover_key).catch(() => {});
  await e.DB.prepare('UPDATE posts SET cover_key = ? WHERE id = ?').bind(key, id).run();
  return new Response(JSON.stringify({ ok: true, key }));
};
