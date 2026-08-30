// 发布「网站使用教程」中英双语文章到博客 D1
import { writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import MarkdownIt from 'markdown-it';

const T = process.env.CLOUDFLARE_API_TOKEN || '';
const A = process.env.CLOUDFLARE_ACCOUNT_ID || '';
const wrEnv = { ...process.env, CLOUDFLARE_API_TOKEN: T, CLOUDFLARE_ACCOUNT_ID: A };

const md = new MarkdownIt({ html: false, linkify: true, typographer: true });
const escape = (s) => s.replace(/'/g, "''");

const zhMd = `# 关于这个网站：完整使用指南

欢迎来到我的个人网站。这里由两个部分组成：**作品集**（www.vobl.cn）和**博客**（blog.vobl.cn，你现在所在的这里）。这篇教程介绍它们各自的功能和用法，也记录了一些设计背后的想法。

## 一、网站构成

作品集展示我的摄影作品，博客用来写文章、和读者交流。两个站点共享同一套设计语言：Fraunces 与 Inter 字体、暖纸色调、金色点缀，以及全站毛玻璃质感（老设备会自动降级为普通实底，不影响使用）。

两站通过链接互通：作品集页头的「日志」直接跳转到博客；博客页头的「回到主页」按钮返回作品集。

## 二、作品集：浏览照片

### 首页

首页顶部是一句问候语，鼠标靠近时会有霓虹光斑效果，点击可以固定。下方是每日轮换的精选作品：除了第一张大图固定之外，其余位置每天自动换一批照片，经常回来会有新鲜感。

### 相册

相册页集中展示全部照片：

- 顶部可以按系列筛选（如风景、人像等）
- 点击任意照片进入全屏浏览
- 全屏模式支持：左右方向键或屏幕两侧按钮切换、滚轮或双击放大查看细节、底部缩略图条快速跳转
- 右下角有下载按钮，可以下载原图（请遵守「禁止商用」的约定）

照片的 WebP 版本经过自动压缩，加载很快；下载的原图则保存在 Cloudflare R2 上。

## 三、博客：注册、评论与个人主页

### 语言

博客支持中英两种界面。页头右侧的语言按钮可以在「中文 / EN」之间切换；切换后，文章列表也会随之改变——中文界面只显示中文文章，英文界面只显示英文文章。

### 注册与登录

- 用邮箱注册：填写邮箱、用户名和密码，系统会向你的邮箱发送 6 位验证码，输入后即完成注册
- 登录有两种方式：密码登录，或发送邮箱验证码登录
- 为了安全，注册和登录都需要完成一次人机验证；密码连续输错会被暂时锁定

### 评论

登录后可以在任意文章下发表评论，支持楼中楼回复。你可以删除自己的评论；管理员可以管理全部评论。

### 个人主页

每个用户都有自己的主页（地址形如 /u/用户名），展示昵称、性别、简介和发表的文章。在「个人中心」可以：

- 更换头像（支持 JPG / PNG / WebP）
- 修改昵称、性别、简介
- 修改密码

## 四、写给站长：管理后台

登录管理员账号后，页头会出现「管理后台」入口，包含：

### 写文章

文章使用 Markdown 写作，支持标题、引用、列表、图片、代码块、表格等语法。发布时可以设置：

- 状态：草稿（不公开）或发布
- 标签：逗号分隔，用于标签页筛选
- 语言：决定文章显示在中文界面还是英文界面
- 封面图：可选，显示在文章卡片上

编辑器提供「预览」按钮，所见即所得地查看渲染效果。

### 评论与用户管理

后台可以隐藏、恢复、删除任何评论；可以封禁或删除违规用户。

### 操作日志

所有关键操作（登录、注册、发文、删文、评论、用户管理）都会记录到操作日志，内容经过 AES-256-GCM 加密后存储，只有持有密钥的人才能解密查看。

## 五、技术架构（简述）

- 前端：Astro，服务端渲染，每页独立加载
- 托管：Cloudflare Pages（全球边缘网络）
- 数据：Cloudflare D1（SQLite）
- 文件：Cloudflare R2（原图、头像、封面）
- 邮件：Lark 邮箱 SMTP 发送验证码
- 安全：人机验证、登录限流、审计日志、安全响应头

## 六、常见问题

- 收不到验证码？先检查垃圾箱；发送频率限制为每分钟一次
- 忘记密码？用验证码登录，然后到个人中心修改密码
- 想下载原图商用？请先通过联系页取得作者同意
- 遇到问题？通过联系页邮箱反馈

感谢阅读，欢迎常来。`;

const enMd = `# A Complete Guide to This Website

Welcome to my personal website. It consists of two parts: the **portfolio** (www.vobl.cn) and this **journal** (blog.vobl.cn). This guide explains what each part does and how to use them, along with some notes on the design.

## 1. Overview

The portfolio showcases my photographs; the journal is for writing and conversation with readers. Both share one design language: Fraunces and Inter typefaces, warm paper tones, gold accents, and frosted-glass surfaces throughout (older devices gracefully fall back to solid panels).

The two sites link to each other: the "Journal" item in the portfolio header jumps here, and the "Portfolio" button in this header takes you back.

## 2. Portfolio: browsing the photographs

### Home

The homepage greets you with a neon highlight that follows the cursor and can be pinned with a click. Below it, the featured works rotate daily: the first large image stays fixed while the remaining slots show a fresh selection every day.

### Gallery

All photographs live on the gallery page:

- Filter by collection at the top
- Click any photo to open the fullscreen viewer
- In the viewer: arrow keys or the side buttons to navigate, scroll wheel or double-click to zoom, and a film strip at the bottom to jump around
- A download button in the corner fetches the original file — please honour the "no commercial use" notice

Optimised WebP versions load quickly; originals are stored on Cloudflare R2.

## 3. Journal: accounts, comments and profiles

### Language

The journal is bilingual. The language button in the header switches between Chinese and English; the article lists follow along — the Chinese interface shows Chinese posts, the English interface shows English posts.

### Sign up and log in

- Sign up with your email: choose a username and password, then enter the 6-digit code sent to your inbox
- Log in with your password, or request an email code instead
- For security, both forms include a human-verification challenge, and repeated wrong passwords trigger a temporary lockout

### Comments

Logged-in readers can comment on any post, with nested replies. You can delete your own comments; the administrator moderates everything else.

### Profiles

Every user has a public profile page (at /u/yourname) showing name, gender, bio and posts. In the profile settings you can:

- Upload an avatar (JPG / PNG / WebP)
- Edit your display name, gender and bio
- Change your password

## 4. For the site owner: the admin panel

Administrators see an extra "Admin" entry in the header. It includes:

### Writing posts

Posts are written in Markdown — headings, quotes, lists, images, code blocks and tables are all supported. Each post can be:

- Draft (hidden) or published
- Tagged, for the tags page
- Assigned to a language, so it appears in the right interface
- Given an optional cover image

A live preview button renders the Markdown before you save.

### Comments and users

Hide, restore or delete any comment; ban or remove abusive users.

### Audit log

Every key action (login, signup, publishing, deleting, commenting, user management) is recorded in an encrypted audit log (AES-256-GCM); only the key holder can decrypt it.

## 5. Architecture, briefly

- Frontend: Astro, server-rendered, each page loads independently
- Hosting: Cloudflare Pages, at the edge
- Data: Cloudflare D1 (SQLite)
- Files: Cloudflare R2 (originals, avatars, covers)
- Email: Lark mailbox SMTP for verification codes
- Security: human verification, login rate limiting, audit logs, hardened headers

## 6. FAQ

- No verification email? Check your spam folder; codes can be sent once per minute
- Forgot your password? Log in with an email code, then change it in your profile
- Want to use a photo commercially? Ask first via the contact page
- Found a problem? Email me through the contact page

Thanks for reading — come back soon.`;

const posts = [
  { slug: 'site-guide-zh', lang: 'zh', title: '关于这个网站：完整使用指南', tags: ['教程', '网站'], md: zhMd },
  { slug: 'site-guide', lang: 'en', title: 'A Complete Guide to This Website', tags: ['Guide', 'Website'], md: enMd },
];

const now = Date.now();
const sqlLines = [];
for (const p of posts) {
  const html = md.render(p.md);
  const excerpt = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 140);
  sqlLines.push(
    `INSERT OR IGNORE INTO posts (id, slug, title, lang, content_md, content_html, excerpt, tags, status, author_id, created_at, updated_at, published_at)
     VALUES ('p_${p.slug}', '${p.slug}', '${escape(p.title)}', '${p.lang}', '${escape(p.md)}', '${escape(html)}', '${escape(excerpt)}', '${JSON.stringify(p.tags)}', 'published', 'u_seed_admin', ${now}, ${now}, ${now});`
  );
  console.log(`prepared ${p.slug} (${p.lang}) | excerpt: ${excerpt.slice(0, 50)}…`);
}

writeFileSync('seed/tutorial.sql', sqlLines.join('\n\n') + '\n', 'utf8');
execSync('npx wrangler d1 execute blogb-db --remote --file seed/tutorial.sql', { stdio: 'inherit', env: wrEnv });
console.log('✅ 两篇教程已发布');
