// 修复迁移文章的 frontmatter 泄漏（CRLF 导致正则没剥掉）：
// 重新渲染两篇 sony 文章的 content_md / content_html / excerpt
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import MarkdownIt from 'markdown-it';

const T = process.env.CLOUDFLARE_API_TOKEN || '';
const A = process.env.CLOUDFLARE_ACCOUNT_ID || '';
const wrEnv = { ...process.env, CLOUDFLARE_API_TOKEN: T, CLOUDFLARE_ACCOUNT_ID: A };

const md = new MarkdownIt({ html: false, linkify: true, typographer: true });
const SRC = 'E:/BLOG/src/content/posts';
const posts = ['sony-2026-awards', 'sony-2026-zh'];

const escape = (s) => s.replace(/'/g, "''");

const sqlLines = [];
for (const slug of posts) {
  let raw = readFileSync(`${SRC}/${slug}.md`, 'utf8');
  // CRLF 安全：剥掉 frontmatter
  raw = raw.replace(/^---[\s\S]*?---\r?\n?/, '').trimStart();
  // 图片路径 → /media/
  raw = raw.replace(/!\[([^\]]*)\]\([^)]*Jiayin%20Guo_000(\d)\.jpg\)/g, (_m, alt, n) => `![${alt}](/media/posts/sony-000${n}.webp)`);
  const html = md.render(raw);
  const excerpt = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 140);

  sqlLines.push(`UPDATE posts SET content_md='${escape(raw)}', content_html='${escape(html)}', excerpt='${escape(excerpt)}' WHERE slug='${slug}';`);
  console.log(`prepared ${slug} | excerpt: ${excerpt.slice(0, 60)}…`);
}

writeFileSync('seed/fix-sony.sql', sqlLines.join('\n') + '\n', 'utf8');
execSync('npx wrangler d1 execute blogb-db --remote --file seed/fix-sony.sql', { stdio: 'inherit', env: wrEnv });
console.log('done');
