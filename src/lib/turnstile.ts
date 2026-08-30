/**
 * Cloudflare Turnstile 人机验证
 * 未配置 TURNSTILE_SECRET 时直接放行（本地开发）；
 * 配置后强制校验客户端 token（远程 IP 透传）。
 */
import type { DBEnv } from './db';

export function turnstileEnabled(e: DBEnv): boolean {
  return !!(e.TURNSTILE_SECRET && e.TURNSTILE_SITEKEY);
}

export async function verifyTurnstile(e: DBEnv, token: string, ip?: string): Promise<boolean> {
  if (!turnstileEnabled(e)) return true;
  if (!token) return false;
  try {
    const form = new URLSearchParams();
    form.set('secret', e.TURNSTILE_SECRET!);
    form.set('response', token);
    if (ip) form.set('remoteip', ip);
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: form,
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
