// 重渲染全部存量文章：给 h2/h3 注入 id（文章页左侧目录需要）
import { writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import MarkdownIt from 'markdown-it';

const T = process.env.CLOUDFLARE_API_TOKEN || '';
const A = process.env.CLOUDFLARE_ACCOUNT_ID || '';
const wrEnv = { ...process.env, CLOUDFLARE_API_TOKEN: T, CLOUDFLARE_ACCOUNT_ID: A };

const md = new MarkdownIt({ html: false, linkify: true, typographer: true });
const slugify = (t) =>
  (t.trim().toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'sec');

const render = (source) =>
  md.render(source || '').replace(/<h([23])>([^<]+)<\/h\1>/g, (_m, tag, text) => `<h${tag} id="${slugify(text)}">${text}</h${tag}>`);

// 从 D1 读取全部文章
const rawOut = execSync(
  'npx wrangler d1 execute blogb-db --remote --command "SELECT slug, content_md FROM posts"',
  { encoding: 'utf8', env: wrEnv, stdio: ['pipe', 'pipe', 'pipe'] }
);
const json = rawOut.replace(/\x1b\[[0-9;]*m/g, '');
const start = json.indexOf('[');
const end = json.lastIndexOf(']');
const parsed = JSON.parse(json.slice(start, end + 1));
const rows = parsed[0]?.results ?? [];

const escape = (s) => s.replace(/'/g, "''");
const sql = [];
for (const r of rows) {
  const html = render(r.content_md);
  sql.push(`UPDATE posts SET content_html='${escape(html)}' WHERE slug='${r.slug}';`);
  console.log('re-rendered:', r.slug);
}
if (sql.length) {
  writeFileSync('seed/rerender.sql', sql.join('\n') + '\n', 'utf8');
  execSync('npx wrangler d1 execute blogb-db --remote --file seed/rerender.sql', { stdio: 'inherit', env: wrEnv });
}
console.log(`done (${sql.length} posts)`);
