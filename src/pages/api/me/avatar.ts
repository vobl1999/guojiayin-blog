import type { APIRoute } from 'astro';
import { env } from '../../../lib/db';
import { uid } from '../../../lib/ids';

const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/** 上传头像到 R2（multipart/form-data，字段名 avatar） */
export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return new Response(JSON.stringify({ error: '未登录' }), { status: 401 });
  const e = env(locals.runtime);

  const form = await request.formData().catch(() => null);
  const file = form?.get('avatar');
  if (!(file instanceof File)) {
    return new Response(JSON.stringify({ error: '请选择图片文件。' }), { status: 400 });
  }
  const ext = ALLOWED[file.type];
  if (!ext) {
    return new Response(JSON.stringify({ error: '仅支持 JPG / PNG / WebP。' }), { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return new Response(JSON.stringify({ error: '图片不能超过 2MB。' }), { status: 400 });
  }

  const key = `avatars/${user.id}_${uid('a', 6).slice(2)}.${ext}`;
  await e.BUCKET.put(key, file.stream(), {
    httpMetadata: { contentType: file.type, cacheControl: 'public, max-age=31536000, immutable' },
  });

  // 删除旧头像
  const old = await e.DB.prepare('SELECT avatar_key FROM users WHERE id = ?').bind(user.id).first<{ avatar_key: string | null }>();
  if (old?.avatar_key) {
    await e.BUCKET.delete(old.avatar_key).catch(() => {});
  }
  await e.DB.prepare('UPDATE users SET avatar_key = ? WHERE id = ?').bind(key, user.id).run();

  return new Response(JSON.stringify({ ok: true, key }));
};
