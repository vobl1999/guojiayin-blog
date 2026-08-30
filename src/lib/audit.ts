/**
 * 操作审计日志：所有用户操作加密后写入 D1（audit_logs 表）。
 * - 加密：AES-256-GCM，密钥来自环境变量 AUDIT_KEY（生产 = Pages secret，本地 = .dev.vars）
 * - 存储格式：<base64(iv)>.<base64(ciphertext)>.vobl  —— 只有持有 AUDIT_KEY 的人能解密
 */
import type { DBEnv } from './db';

const TE = new TextEncoder();

async function keyBytes(e: DBEnv): Promise<CryptoKey | null> {
  const raw = (e.AUDIT_KEY || '').trim();
  if (!raw || raw.length < 32) return null;
  const keyHex = raw.replace(/[^0-9a-fA-F]/g, '');
  const bytes = new Uint8Array(keyHex.match(/.{2}/g)?.map((h) => parseInt(h, 16)) ?? []);
  if (bytes.length !== 32) return null;
  return crypto.subtle.importKey('raw', bytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

/** 加密一条日志 → `iv.cipher.vobl` 字符串 */
export async function encryptLog(e: DBEnv, plain: string): Promise<string> {
  const key = await keyBytes(e);
  if (!key) return `plain:${plain}`; // 无密钥兜底（不应发生；生产必有）
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, TE.encode(plain));
  const toB64 = (b: ArrayBuffer | Uint8Array) =>
    btoa(String.fromCharCode(...new Uint8Array(b as ArrayBuffer)));
  return `${toB64(iv)}.${toB64(cipher)}.vobl`;
}

export interface AuditMeta {
  ip?: string;
  ua?: string;
}

/** 记录一条用户操作（必须 await：Workers 会冻结未完成的 fire-and-forget 异步） */
export async function audit(
  e: DBEnv,
  userId: string | null,
  action: string,
  detail: Record<string, unknown> = {},
  meta: AuditMeta = {}
): Promise<void> {
  const plain = JSON.stringify({
    t: Date.now(),
    user: userId ?? '-',
    action,
    detail,
    ip: meta.ip ?? '-',
    ua: (meta.ua ?? '-').slice(0, 200),
  });
  const enc = await encryptLog(e, plain);
  await e.DB.prepare('INSERT INTO audit_logs (id, encrypted, created_at) VALUES (?, ?, ?)')
    .bind(`al_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`, enc, Date.now())
    .run()
    .catch(() => {});
}

export function clientMeta(request: Request): AuditMeta {
  return {
    ip: request.headers.get('cf-connecting-ip') ?? request.headers.get('x-forwarded-for') ?? undefined,
    ua: request.headers.get('user-agent') ?? undefined,
  };
}

/** 解密一条 .vobl 记录（本地工具用，例如 node scripts/decrypt-logs.mjs） */
export async function decryptLog(rawKey: string, enc: string): Promise<string> {
  const [ivB64, cipherB64] = enc.replace(/\.vobl$/, '').split('.');
  const keyHex = rawKey.trim().replace(/[^0-9a-fA-F]/g, '');
  const bytes = new Uint8Array(keyHex.match(/.{2}/g)!.map((h) => parseInt(h, 16)));
  const key = await crypto.subtle.importKey('raw', bytes, { name: 'AES-GCM' }, false, ['decrypt']);
  const fromB64 = (s: string) => {
    const bin = atob(s);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return arr;
  };
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromB64(ivB64) },
    key,
    fromB64(cipherB64)
  );
  return new TextDecoder().decode(plain);
}
