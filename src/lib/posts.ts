/**
 * 文章与评论的数据查询（D1）
 */
import type { DBEnv } from './db';

export interface Post {
  id: string;
  slug: string;
  title: string;
  content_md: string;
  content_html: string;
  excerpt: string;
  cover_key: string | null;
  tags: string[];
  status: 'draft' | 'published';
  author_id: string;
  views: number;
  created_at: number;
  updated_at: number;
  published_at: number | null;
  author_name?: string;
  author_username?: string;
  author_avatar?: string | null;
  comment_count?: number;
}

function parseTags(raw: string): string[] {
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.map(String) : [];
  } catch {
    return [];
  }
}

function rowToPost(r: Record<string, unknown>): Post {
  return {
    id: String(r.id),
    slug: String(r.slug),
    title: String(r.title),
    content_md: String(r.content_md),
    content_html: String(r.content_html),
    excerpt: String(r.excerpt),
    cover_key: (r.cover_key as string) ?? null,
    tags: parseTags(String(r.tags)),
    status: String(r.status) as Post['status'],
    author_id: String(r.author_id),
    views: Number(r.views),
    created_at: Number(r.created_at),
    updated_at: Number(r.updated_at),
    published_at: r.published_at == null ? null : Number(r.published_at),
    author_name: r.author_name ? String(r.author_name) : undefined,
    author_username: r.author_username ? String(r.author_username) : undefined,
    author_avatar: (r.author_avatar as string) ?? null,
    comment_count: r.comment_count == null ? undefined : Number(r.comment_count),
  };
}

const SELECT_POST = `
  SELECT p.*, u.name AS author_name, u.username AS author_username, u.avatar_key AS author_avatar,
    (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id AND c.status = 'visible') AS comment_count
  FROM posts p JOIN users u ON u.id = p.author_id`;

/** 已发布文章分页列表（新→旧） */
export async function listPublishedPosts(e: DBEnv, page = 1, pageSize = 10) {
  const offset = Math.max(0, page - 1) * pageSize;
  const { results } = await e.DB.prepare(
    `${SELECT_POST} WHERE p.status = 'published' ORDER BY p.published_at DESC LIMIT ? OFFSET ?`
  )
    .bind(pageSize, offset)
    .all();
  const count = await e.DB.prepare(`SELECT COUNT(*) AS n FROM posts WHERE status = 'published'`).first<{ n: number }>();
  return {
    posts: (results as unknown as Record<string, unknown>[]).map(rowToPost),
    total: count?.n ?? 0,
    pages: Math.max(1, Math.ceil((count?.n ?? 0) / pageSize)),
  };
}

export async function getPostBySlug(e: DBEnv, slug: string): Promise<Post | null> {
  const r = await e.DB.prepare(`${SELECT_POST} WHERE p.slug = ? LIMIT 1`).bind(slug).first();
  return r ? rowToPost(r as unknown as Record<string, unknown>) : null;
}

export async function getPostById(e: DBEnv, id: string): Promise<Post | null> {
  const r = await e.DB.prepare(`${SELECT_POST} WHERE p.id = ? LIMIT 1`).bind(id).first();
  return r ? rowToPost(r as unknown as Record<string, unknown>) : null;
}

/** 管理后台：全部文章（含草稿） */
export async function listAllPosts(e: DBEnv) {
  const { results } = await e.DB.prepare(`${SELECT_POST} ORDER BY p.updated_at DESC`).all();
  return (results as unknown as Record<string, unknown>[]).map(rowToPost);
}

export async function listPostsByTag(e: DBEnv, tag: string) {
  const { results } = await e.DB.prepare(
    `${SELECT_POST} WHERE p.status = 'published' ORDER BY p.published_at DESC LIMIT 60`
  ).all();
  const all = (results as unknown as Record<string, unknown>[]).map(rowToPost);
  return all.filter((p) => p.tags.includes(tag));
}

export async function listAllTags(e: DBEnv): Promise<{ tag: string; count: number }[]> {
  const { results } = await e.DB.prepare(
    `SELECT tags FROM posts WHERE status = 'published'`
  ).all();
  const counts = new Map<string, number>();
  for (const r of results as unknown as { tags: string }[]) {
    for (const t of parseTags(r.tags)) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return [...counts.entries()].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count);
}

export async function listPostsByAuthor(e: DBEnv, userId: string) {
  const { results } = await e.DB.prepare(
    `${SELECT_POST} WHERE p.status = 'published' AND p.author_id = ? ORDER BY p.published_at DESC LIMIT 50`
  )
    .bind(userId)
    .all();
  return (results as unknown as Record<string, unknown>[]).map(rowToPost);
}

/** 全部已发布文章（RSS/归档用） */
export async function listAllPublished(e: DBEnv) {
  const { results } = await e.DB.prepare(
    `${SELECT_POST} WHERE p.status = 'published' ORDER BY p.published_at DESC LIMIT 200`
  ).all();
  return (results as unknown as Record<string, unknown>[]).map(rowToPost);
}

export async function bumpViews(e: DBEnv, id: string): Promise<void> {
  await e.DB.prepare('UPDATE posts SET views = views + 1 WHERE id = ?').bind(id).run();
}

/* ── 评论 ─────────────────────────────────────────────────── */

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  status: 'visible' | 'hidden';
  created_at: number;
  updated_at: number;
  user_name: string;
  user_username: string;
  user_avatar: string | null;
}

export async function listComments(e: DBEnv, postId: string): Promise<Comment[]> {
  const { results } = await e.DB.prepare(
    `SELECT c.*, u.name AS user_name, u.username AS user_username, u.avatar_key AS user_avatar
     FROM comments c JOIN users u ON u.id = c.user_id
     WHERE c.post_id = ? ORDER BY c.created_at ASC`
  )
    .bind(postId)
    .all();
  return (results as unknown as Comment[]).map((c) => ({ ...c, created_at: Number(c.created_at) }));
}

export async function listAllComments(e: DBEnv): Promise<(Comment & { post_title: string; post_slug: string })[]> {
  const { results } = await e.DB.prepare(
    `SELECT c.*, u.name AS user_name, u.username AS user_username, u.avatar_key AS user_avatar,
            p.title AS post_title, p.slug AS post_slug
     FROM comments c JOIN users u ON u.id = c.user_id JOIN posts p ON p.id = c.post_id
     ORDER BY c.created_at DESC LIMIT 200`
  ).all();
  return results as unknown as (Comment & { post_title: string; post_slug: string })[];
}

export async function countCommentsForUser(e: DBEnv, userId: string): Promise<number> {
  const r = await e.DB.prepare(`SELECT COUNT(*) AS n FROM comments WHERE user_id = ? AND status = 'visible'`)
    .bind(userId)
    .first<{ n: number }>();
  return r?.n ?? 0;
}
