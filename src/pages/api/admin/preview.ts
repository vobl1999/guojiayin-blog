import type { APIRoute } from 'astro';
import { renderMarkdown } from '../../../lib/markdown';

/** 编辑器预览：服务端渲染 Markdown（不把渲染器发给客户端） */
export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user || locals.user.role !== 'admin') {
    return new Response(JSON.stringify({ error: '无权限' }), { status: 403 });
  }
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const html = renderMarkdown(String(body.md ?? '').slice(0, 200_000));
  return new Response(JSON.stringify({ html }));
};
