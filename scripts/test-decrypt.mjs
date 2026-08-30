// 验证审计日志解密：从 D1 取最新一条，用本地 .audit-key 解密
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const key = readFileSync('.audit-key', 'utf8').trim();

const raw = execSync(
  'npx wrangler d1 execute blogb-db --remote --command "SELECT encrypted FROM audit_logs ORDER BY created_at DESC LIMIT 1"',
  {
    encoding: 'utf8',
    env: {
      ...process.env,
      CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN || '',
      CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID || '',
    },
    stdio: ['pipe', 'pipe', 'pipe'],
  }
);
const json = raw.replace(/\x1b\[[0-9;]*m/g, '');
const match = json.match(/"encrypted":\s*"([^"]+)"/);
if (!match) {
  console.log('未找到密文记录');
  process.exit(0);
}
const enc = match[1];
console.log('密文:', enc.slice(0, 60) + '…', '| .vobl 后缀:', enc.endsWith('.vobl'));

const [ivB64, cipherB64] = enc.replace(/\.vobl$/, '').split('.');
const keyBytes = new Uint8Array(key.match(/.{2}/g).map((h) => parseInt(h, 16)));
const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['decrypt']);
const fromB64 = (s) => {
  const bin = atob(s);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
};
const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(ivB64) }, cryptoKey, fromB64(cipherB64));
console.log('解密结果:', new TextDecoder().decode(plain));
