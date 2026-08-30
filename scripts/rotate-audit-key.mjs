// 轮换 AUDIT_KEY + 清空旧加密日志（旧密钥已随 .audit-key 误推公开）
import { writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import crypto from 'node:crypto';

const T = process.env.CLOUDFLARE_API_TOKEN || '';
const A = process.env.CLOUDFLARE_ACCOUNT_ID || '';
const wrEnv = { ...process.env, CLOUDFLARE_API_TOKEN: T, CLOUDFLARE_ACCOUNT_ID: A };

const key = crypto.randomBytes(32).toString('hex');
writeFileSync('.audit-key', key + '\n', 'utf8');

execSync('npx wrangler pages secret put AUDIT_KEY --project-name blogb', {
  input: key + '\n',
  stdio: ['pipe', 'pipe', 'pipe'],
  env: wrEnv,
});
console.log('AUDIT_KEY rotated (local .audit-key + Pages secret 已更新)');

execSync('npx wrangler d1 execute blogb-db --remote --command "DELETE FROM audit_logs"', {
  stdio: 'inherit',
  env: wrEnv,
});
console.log('旧加密日志已清空');
