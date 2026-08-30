// 端到端：模拟已通过 Turnstile 的用户（合法通行 token）能否正常浏览
import { execSync } from 'node:child_process';
import crypto from 'node:crypto';

const B = 'https://blog.vobl.cn';
const T = process.env.CLOUDFLARE_API_TOKEN || '';
const A = process.env.CLOUDFLARE_ACCOUNT_ID || '';

const raw = Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => b.toString(16).padStart(2, '0')).join('');
const hash = crypto.createHash('sha256').update(raw).digest('hex');
const expires = Date.now() + 24 * 3600 * 1000;

execSync(
  `npx wrangler d1 execute blogb-db --remote --command "INSERT INTO gate_tokens (token_hash, expires_at) VALUES ('${hash}', ${expires})"`,
  { stdio: 'ignore', env: { ...process.env, CLOUDFLARE_API_TOKEN: T, CLOUDFLARE_ACCOUNT_ID: A } }
);

(async () => {
  const r = await fetch(B + '/', { redirect: 'manual', headers: { accept: 'text/html', cookie: `blogb_gate=${raw}` } });
  console.log('with valid gate cookie:', r.status, r.status === 200 ? '✓ 正常浏览' : r.headers.get('location'));
})();
