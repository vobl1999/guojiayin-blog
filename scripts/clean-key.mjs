// 紧急清理：删除远端 .audit-key（误推上公开仓库）
import { execSync } from 'node:child_process';

const cred = execSync('git credential fill', {
  input: 'protocol=https\nhost=github.com\n\n',
  encoding: 'utf8',
});
const token = cred.split('\n').find((l) => l.startsWith('password=')).replace('password=', '');

const api = async (path, opts = {}) => {
  const res = await fetch(`https://api.github.com/repos/vobl1999/guojiayin-blog${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'blogb-fix', ...(opts.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
};

(async () => {
  const tree = await api('/git/trees/main?recursive=1');
  const hit = (tree.body.tree || []).find((t) => t.path === '.audit-key');
  if (!hit) {
    console.log('.audit-key not on remote — 无需处理');
    return;
  }
  console.log('found .audit-key, deleting…');
  const del = await api('/contents/.audit-key', {
    method: 'DELETE',
    body: JSON.stringify({ message: 'chore: remove leaked audit key (rotation required)', sha: hit.sha }),
  });
  console.log('delete:', del.status, del.body.commit ? `ok ${del.body.commit.sha.slice(0, 7)}` : JSON.stringify(del.body).slice(0, 200));
})();
