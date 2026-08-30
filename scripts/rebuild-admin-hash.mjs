// 重建管理员 gjy@vobl.cn 的密码哈希（改用 12k 迭代；随机密码，实际登录走邮箱验证码）
// 同时清理 CPU 测试残留（cputest 验证码/登录尝试）
import { execSync } from 'node:child_process';
import crypto from 'node:crypto';

const T = process.env.CLOUDFLARE_API_TOKEN || '';
const A = process.env.CLOUDFLARE_ACCOUNT_ID || '';
const wrEnv = { ...process.env, CLOUDFLARE_API_TOKEN: T, CLOUDFLARE_ACCOUNT_ID: A };

async function pbkdf2Hex(password, saltHex) {
  const salt = new Uint8Array(saltHex.match(/.{2}/g).map((h) => parseInt(h, 16)));
  const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 12_000, hash: 'SHA-256' }, km, 256);
  return Array.from(new Uint8Array(bits), (b) => b.toString(16).padStart(2, '0')).join('');
}

const salt = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');
const hash = await pbkdf2Hex(crypto.randomBytes(24).toString('hex'), salt);

execSync(
  `npx wrangler d1 execute blogb-db --remote --command "UPDATE users SET password_hash='${hash}', password_salt='${salt}' WHERE email='gjy@vobl.cn'; DELETE FROM verify_codes WHERE email='cputest@vobl.cn'; DELETE FROM login_attempts; DELETE FROM users WHERE email='cputest@vobl.cn';"`,
  { stdio: 'inherit', env: wrEnv }
);
console.log('admin hash rebuilt (12k), test residue cleaned');
