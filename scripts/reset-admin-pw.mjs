// 查询管理员账号状态 + 重置为临时密码（PBKDF2-12k，与站点一致）
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

// 1) 当前状态
const rows = execSync(
  `npx wrangler d1 execute blogb-db --remote --command "SELECT email, username, role FROM users WHERE email='gjy@vobl.cn'"`,
  { encoding: 'utf8', env: wrEnv, stdio: ['pipe', 'pipe', 'pipe'] }
);
const plain = rows.replace(/\x1b\[[0-9;]*m/g, '');
const email = plain.match(/"email":\s*"([^"]+)"/)?.[1];
const username = plain.match(/"username":\s*"([^"]+)"/)?.[1];
const role = plain.match(/"role":\s*"([^"]+)"/)?.[1];
console.log(`当前账号: ${email} / @${username} / role=${role}`);

// 2) 重置为临时密码
const tempPw = 'Vobl' + Math.random().toString(36).slice(2, 8) + '!9x';
const salt = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');
const hash = await pbkdf2Hex(tempPw, salt);

execSync(
  `npx wrangler d1 execute blogb-db --remote --command "UPDATE users SET password_hash='${hash}', password_salt='${salt}' WHERE email='gjy@vobl.cn'"`,
  { stdio: 'ignore', env: wrEnv }
);
console.log(`✅ 临时密码: ${tempPw}`);
console.log('登录地址: https://blog.vobl.cn/login');
