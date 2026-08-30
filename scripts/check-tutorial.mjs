// 验证两篇教程：按语言界面显示 + 文章页渲染
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

(async () => {
  const zhHome = await (await fetch(B + '/', { headers: { accept: 'text/html', cookie: gateCookie + '; blogb_lang=zh' } })).text();
  console.log('zh 首页含中文教程:', zhHome.includes('关于这个网站：完整使用指南'));
  console.log('zh 首页无英文教程:', !zhHome.includes('A Complete Guide to This Website'));

  const enHome = await (await fetch(B + '/', { headers: { accept: 'text/html', cookie: gateCookie + '; blogb_lang=en' } })).text();
  console.log('en 首页含英文教程:', enHome.includes('A Complete Guide to This Website'));
  console.log('en 首页无中文教程:', !enHome.includes('关于这个网站：完整使用指南'));

  const zhPost = await (await fetch(B + '/post/site-guide-zh', { headers: { accept: 'text/html', cookie: gateCookie } })).text();
  console.log('zh 教程页:', zhPost.includes('关于这个网站：完整使用指南'), '| 含后台章节:', zhPost.includes('管理后台'));

  const enPost = await (await fetch(B + '/post/site-guide', { headers: { accept: 'text/html', cookie: gateCookie } })).text();
  console.log('en 教程页:', enPost.includes('A Complete Guide to This Website'), '| 含 admin 章节:', enPost.includes('admin panel'));
})();
