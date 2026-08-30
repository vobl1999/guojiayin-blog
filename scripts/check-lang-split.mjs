// 带合法大门 cookie + 语言 cookie 验证文章语言区分
import { execSync } from 'node:child_process';
import crypto from 'node:crypto';

const B = 'https://blog.vobl.cn';
const T = process.env.CLOUDFLARE_API_TOKEN || '';
const A = process.env.CLOUDFLARE_ACCOUNT_ID || '';

const gateRaw = Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => b.toString(16).padStart(2, '0')).join('');
const gateHash = crypto.createHash('sha256').update(gateRaw).digest('hex');
execSync(
  `npx wrangler d1 execute blogb-db --remote --command "INSERT INTO gate_tokens (token_hash, expires_at) VALUES ('${gateHash}', ${Date.now() + 3600_000})"`,
  { stdio: 'ignore', env: { ...process.env, CLOUDFLARE_API_TOKEN: T, CLOUDFLARE_ACCOUNT_ID: A } }
);
const gateCookie = `blogb_gate=${gateRaw}`;

const get = async (path, lang) => {
  const cookies = [gateCookie];
  if (lang) cookies.push(`blogb_lang=${lang}`);
  const r = await fetch(B + path, { headers: { accept: 'text/html', cookie: cookies.join('; ') } });
  return r.text();
};

(async () => {
  const zh = await get('/', 'zh');
  console.log('zh 界面：有中文文章:', zh.includes('索尼 2026 摄影大赛'), '| 无英文文章:', !zh.includes('Sony 2026 Photography Awards'));

  const en = await get('/', 'en');
  console.log('en 界面：有英文文章:', en.includes('Sony 2026 Photography Awards'), '| 无中文文章:', !en.includes('索尼 2026 摄影大赛'));

  const zhArchive = await get('/archive', 'zh');
  console.log('zh 归档：无英文:', !zhArchive.includes('Sony 2026 Photography Awards'), '| 有中文:', zhArchive.includes('索尼 2026 摄影大赛'));
})();
