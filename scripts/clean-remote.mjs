// 清理远端仓库：删除 .dev.vars（含旧 SESSION_SECRET，曾误推上公开仓库）
import { execSync } from 'node:child_process';

const cred = execSync('git credential fill', {
  input: 'protocol=https\nhost=github.com\n\n',
  encoding: 'utf8',
});
const token = cred.split('\n').find((l) => l.startsWith('password=')).replace('password=', '');

const OWNER = 'vobl1999';
const REPO = 'guojiayin-blog';

const api = async (path, opts = {}) => {
  const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'blogb-clean', ...(opts.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
};

(async () => {
  // 列出远端文件，找 .dev.vars 的 sha
  const tree = await api('/git/trees/main?recursive=1');
  const devVars = (tree.body.tree || []).find((t) => t.path === '.dev.vars');
  console.log('remote .dev.vars:', devVars ? `found sha=${devVars.sha}` : 'not found');

  if (devVars) {
    const del = await api(`/contents/.dev.vars`, {
      method: 'DELETE',
      body: JSON.stringify({ message: 'chore: remove .dev.vars (secret hygiene)', sha: devVars.sha }),
    });
    console.log('delete:', del.status, del.body.commit ? `ok commit=${del.body.commit.sha.slice(0, 7)}` : JSON.stringify(del.body).slice(0, 200));
  }
})();
