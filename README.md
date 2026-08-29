# Guo Jiayin — Journal（blog.vobl.cn）

郭嘉胤的个人博客，与作品集（www.vobl.cn）共用设计语言：Fraunces + Inter、暖纸色调、金色点缀、**全站毛玻璃**（老设备自动降级为实底）。

## 功能

- **博客**：Markdown 写作、草稿/发布、标签、封面、归档、分页、RSS、阅读时长、浏览计数
- **账号**：邮箱注册/登录（Lark 飞书邮箱 SMTP 验证码，也支持密码登录）、会话 Cookie
- **评论**：登录后评论、楼中楼回复、删除自己的评论
- **用户主页**：`/u/用户名` 公开主页，可换头像（R2 存储）、改昵称、性别、简介
- **管理后台**：`/admin` 文章管理、Markdown 编辑器（服务端预览）、评论管理、用户管理（封禁/删除）
- **性能**：每页独立加载（无整站 JS 包）、SSR 直出、R2 媒体走同域 `/media/` 长缓存

## 技术栈

Astro 5（SSR）· @astrojs/cloudflare · Cloudflare Pages · D1（SQLite）· R2（头像/封面）· markdown-it

## 本地开发

```bash
npm install
# 复制 .dev.vars.example 为 .dev.vars 并填写（SESSION_SECRET、Lark SMTP）
npm run dev        # http://localhost:4321（D1/R2 绑定走 wrangler platform proxy）
npm run build
```

## 部署

```bash
# 1. 建库（一次性）：wrangler d1 create blogb-db → 把 database_id 填进 wrangler.toml
npm run db:migrate:remote        # 2. 执行 migrations/0001_init.sql
npm run deploy                   # 3. wrangler pages deploy dist --project-name=blogb
# 4. 生产密钥（wrangler pages secret put，见 .dev.vars.example）
```

## 说明

- 注册第一个账号后，用管理员把它提为 admin：
  `wrangler d1 execute blogb-db --remote --command "UPDATE users SET role='admin' WHERE email='你的邮箱'"`
- GitHub 同步：`node scripts/push.mjs "提交信息"`（github.com:443 被墙时走 API）
