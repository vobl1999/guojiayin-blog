import type { APIRoute } from 'astro';
import { env } from '../../lib/db';

const TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  avif: 'image/avif',
};

/** 同域媒体通道：读取 R2 中的头像/封面/文章图（key 允许子目录，每段只允许安全字符，防路径穿越） */
export const GET: APIRoute = async ({ params, locals }) => {
  const key = (params.key ?? '').replace(/\/+/g, '/').replace(/^\/|\/$/g, '');
  if (!key || !key.split('/').every((seg) => /^[a-zA-Z0-9_.-]+$/.test(seg) && seg !== '..')) {
    return new Response('Not found', { status: 404 });
  }
  const e = env(locals.runtime);
  const obj = await e.BUCKET.get(key);
  if (!obj) return new Response('Not found', { status: 404 });

  const ext = key.split('.').pop()?.toLowerCase() ?? '';
  const headers = new Headers();
  headers.set('Content-Type', TYPES[ext] ?? 'application/octet-stream');
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  headers.set('Content-Length', String(obj.size));
  return new Response(obj.body as unknown as ReadableStream, { headers });
};
