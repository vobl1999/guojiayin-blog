/**
 * 内容迁移：把主站的 sony-2026 两篇文章种入 blogb 的远程 D1，
 * 并把文章里引用的 3 张照片传到 blogb R2。
 * 前置：已生成 seed/sony-000{1,2,3}.webp；管理员种子用户 gjy@vobl.cn。
 * 用法：node scripts/seed-sony.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import MarkdownIt from 'markdown-it';

async function pbkdf2Hex(password, saltHex) {
  const salt = new Uint8Array(saltHex.match(/.{2}/g).map((h) => parseInt(h, 16)));
  const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 12_000, hash: 'SHA-256' }, km, 256);
  return Array.from(new Uint8Array(bits), (b) => b.toString(16).padStart(2, '0')).join('');
}

const T = process.env.CLOUDFLARE_API_TOKEN || '';
const A = process.env.CLOUDFLARE_ACCOUNT_ID || '';
const wranglerEnv = {
  ...process.env,
  CLOUDFLARE_API_TOKEN: T,
  CLOUDFLARE_ACCOUNT_ID: A,
};

const md = new MarkdownIt({ html: false, linkify: true, typographer: true });

const SRC = 'E:/BLOG/src/content/posts';
const posts = [
  { file: 'sony-2026-awards.md', slug: 'sony-2026-awards', img: 'sony-0001.webp', tags: ['比赛', '索尼'], title: 'Sony 2026 Photography Awards — Youth Entry', date: '2026-01-15' },
  { file: 'sony-2026-zh.md', slug: 'sony-2026-zh', img: 'sony-0002.webp', tags: ['比赛', '索尼'], title: '索尼 2026 摄影大赛 · 青年赛参赛作品', date: '2026-01-15' },
];

// 1) 上传 3 张图片到 blogb R2
for (const n of [1, 2, 3]) {
  const key = `posts/sony-000${n}.webp`;
  execSync(`npx wrangler r2 object put "blogb-assets/${key}" --file "seed/sony-000${n}.webp" --remote`, {
    stdio: 'inherit',
    env: wranglerEnv,
  });
  console.log(`R2 上传 ${key}`);
}

// 2) 管理员种子用户（随机密码，实际用验证码登录后再改密）
const salt = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');
const hash = await pbkdf2Hex(Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2), salt);

// 3) 生成 SQL
const escape = (s) => s.replace(/'/g, "''");
const sqlLines = [];
sqlLines.push(`INSERT OR IGNORE INTO users (id, email, password_hash, password_salt, username, name, role, email_verified, created_at)
VALUES ('u_seed_admin', 'gjy@vobl.cn', '${hash}', '${salt}', 'jiayin', '郭嘉胤', 'admin', 1, ${Date.now()});`);

for (const p of posts) {
  let raw = readFileSync(`${SRC}/${p.file}`, 'utf8');
  // 去掉 frontmatter（兼容 Windows CRLF）
  raw = raw.replace(/^---[\s\S]*?---\r?\n?/, '').trimStart();
  // 把本地图片路径换成 /media/ 同域图
  raw = raw.replace(/!\[([^\]]*)\]\([^)]*Jiayin%20Guo_000(\d)\.jpg\)/g, (_m, alt, n) => `![${alt}](/media/posts/sony-000${n}.webp)`);
  const html = md.render(raw);
  const excerpt = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 140);
  const ts = new Date(`${p.date}T00:00:00Z`).getTime();
  sqlLines.push(`INSERT OR IGNORE INTO posts (id, slug, title, content_md, content_html, excerpt, tags, status, author_id, created_at, updated_at, published_at)
VALUES ('p_${p.slug}', '${p.slug}', '${escape(p.title)}', '${escape(raw)}', '${escape(html)}', '${escape(excerpt)}', '${JSON.stringify(p.tags)}', 'published', 'u_seed_admin', ${ts}, ${ts}, ${ts});`);
}

writeFileSync('seed/seed.sql', sqlLines.join('\n\n') + '\n', 'utf8');
console.log('已生成 seed/seed.sql');

// 4) 执行远程迁移
execSync('npx wrangler d1 execute blogb-db --remote --file seed/seed.sql', {
  stdio: 'inherit',
  env: wranglerEnv,
});
console.log('✅ 种子完成');
