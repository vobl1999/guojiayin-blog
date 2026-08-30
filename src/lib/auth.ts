/**
 * 密码哈希与校验（PBKDF2-SHA256，Web Crypto，Worker/Node 通用）
 */
import { uid } from './ids';

const ITERATIONS = 12_000; // 免费版 Pages CPU 限制下 120k 会超时；配合限流+Turnstile 兜底

async function derive(password: string, saltHex: string, length = 32): Promise<string> {
  const saltBytes = new Uint8Array(saltHex.match(/.{2}/g)!.map((h) => parseInt(h, 16)));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBytes, iterations: ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    length * 8
  );
  return Array.from(new Uint8Array(bits), (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const salt = uid('s', 8).slice(2); // 16 hex chars
  const hash = await derive(password, salt);
  return { hash, salt };
}

export async function verifyPassword(password: string, salt: string, expected: string): Promise<boolean> {
  const hash = await derive(password, salt);
  // 恒时比较
  let diff = hash.length ^ expected.length;
  const a = hash.split('');
  const b = expected.split('');
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    diff |= (a[i] ?? '').charCodeAt(0) ^ (b[i] ?? '').charCodeAt(0);
  }
  return diff === 0;
}
