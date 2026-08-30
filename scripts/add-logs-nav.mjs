// 给所有后台页面的导航加「操作日志」链接
import { readFileSync, writeFileSync } from 'node:fs';

const files = [
  'src/pages/admin/index.astro',
  'src/pages/admin/posts.astro',
  'src/pages/admin/post/[id].astro',
  'src/pages/admin/comments.astro',
  'src/pages/admin/users.astro',
];
const OLD = '<a href="/admin/users">用户管理</a>';
const NEW = '<a href="/admin/users">用户管理</a>\n        <a href="/admin/logs">操作日志</a>';

for (const f of files) {
  let s = readFileSync(f, 'utf8');
  if (s.includes(OLD) && !s.includes('href="/admin/logs"')) {
    s = s.replace(OLD, NEW);
    writeFileSync(f, s);
    console.log('updated:', f);
  }
}
