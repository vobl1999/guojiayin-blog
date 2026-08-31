// 验证 voblog 改版全项
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
const gate = `blogb_gate=${gateRaw}`;

(async () => {
  const home = await (await fetch(B + '/', { headers: { accept: 'text/html', cookie: gate } })).text();
  console.log('品牌名 voblog:', home.includes('voblog'));
  console.log('中文名 沃博客:', home.includes('沃博客'));
  console.log('导航含数据页:', home.includes('/stats'));
  console.log('白色背景(paper #fff):', home.includes('#ffffff'));
  console.log('Nunito 字体:', home.includes('Nunito Variable'));

  const css = await (await fetch(B + '/_astro/' + (home.match(/href="\/_astro\/([^"]+\.css)"/)?.[1] ?? ''))).text();
  console.log('文章标题浅蓝 #5b9bd5:', css.includes('#5b9bd5'));
  console.log('进度条样式:', css.includes('read-progress'));
  console.log('TOC 样式:', css.includes('post-toc'));
  console.log('图表样式:', css.includes('stats-chart'));

  // 文章页：进度条 + 目录
  const post = await (await fetch(B + '/post/site-guide-zh', { headers: { accept: 'text/html', cookie: gate } })).text();
  console.log('文章进度条 DOM:', post.includes('data-read-progress'));
  console.log('文章左侧目录:', post.includes('post-toc') && post.includes('data-toc-link'));
  console.log('标题带锚点 id:', /<h2 id="/.test(post));

  // 数据页
  const stats = await (await fetch(B + '/stats', { headers: { accept: 'text/html', cookie: gate } })).text();
  console.log('数据页 200 与图表:', stats.includes('stats-chart'), '| 实时数据文案:', stats.includes('实时统计'));

  // 页脚回主页
  console.log('页脚回主页链接:', home.includes('www.vobl.cn'));
})();
