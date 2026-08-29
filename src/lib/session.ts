/**
 * 会话管理：DB 存 token 哈希，Cookie 只存原始 token
 */
import { sha256Hex, token } from './ids';

export interface SessionUser {
  id: string;
  email: string;
  username: string;
  name: string;
  gender: string | null;
  avatarKey: string | null;
  bio: string | null;
  role: 'admin' | 'user' | 'banned';
  createdAt: string;
}

export const SESSION_COOKIE = 'blogb_session';
const SESSION_DAYS = 30;

export async function createSession(
  db: D1Database,
  userId: string
): Promise<{ raw: string; expiresAt: number }> {
  const raw = token(32);
  const hash = await sha256Hex(raw);
  const expiresAt = Date.now() + SESSION_DAYS * 86400_000;
  await db
    .prepare(
      'INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)'
    )
    .bind(hash, userId, expiresAt)
    .run();
  return { raw, expiresAt };
}

export async function destroySession(db: D1Database, raw: string): Promise<void> {
  const hash = await sha256Hex(raw);
  await db.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(hash).run();
}

export async function userBySession(db: D1Database, raw: string): Promise<SessionUser | null> {
  if (!raw) return null;
  const hash = await sha256Hex(raw);
  const row = await db
    .prepare(
      `SELECT u.*, s.expires_at FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > ? LIMIT 1`
    )
    .bind(hash, Date.now())
    .first<SessionUser & { expires_at: number }>();
  if (!row) return null;
  return row;
}

export async function userById(db: D1Database, id: string): Promise<SessionUser | null> {
  return db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<SessionUser>();
}

/** 清理过期会话（登录时顺带调用） */
export async function sweepSessions(db: D1Database): Promise<void> {
  await db.prepare('DELETE FROM sessions WHERE expires_at <= ?').bind(Date.now()).run();
}
