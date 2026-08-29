/**
 * 一键推送 blogb 到 GitHub（github.com:443 被墙，走 api.github.com）
 * 首次运行会创建仓库并推送全部文件；之后只同步改动。
 * 用法：node scripts/push.mjs ["提交信息"]
 */
import { readFileSync, statSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, relative } from 'node:path';

const OWNER = 'vobl1999';
const REPO = 'guojiayin-blog';
const BRANCH = 'main';
const MSG = process.argv[2] || 'update: blogb';

const IGNORE = new Set(['.git', 'node_modules', 'dist', '.astro', '.wrangler', '.npm-cache']);
const MAX_BLOB = 45 * 1024 * 1024; // GitHub blob API 上限 100MB，保守 45MB

const cred = execSync('git credential fill', {
  input: 'protocol=https\nhost=github.com\n\n',
  encoding: 'utf8',
});
const token = cred.split('\n').find((l) => l.startsWith('password=')).replace('password=', '');

const api = async (path, opts = {}) => {
  const res = await fetch(`https://api.github.com${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      'User-Agent': 'blogb-push',
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`${opts.method || 'GET'} ${path} -> ${res.status} ${JSON.stringify(body).slice(0, 300)}`);
  return body;
};

// 递归收集要提交的文件（跳过忽略目录）
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (IGNORE.has(name)) continue;
    const full = join(dir, name);
    const rel = relative('.', full).replace(/\\/g, '/');
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else {
      if (st.size > MAX_BLOB) {
        console.warn(`跳过过大文件: ${rel} (${st.size} bytes)`);
        continue;
      }
      out.push(rel);
    }
  }
  return out.sort();
}

// 确保仓库存在（不存在则创建）
try {
  await api(`/repos/${OWNER}/${REPO}`);
  console.log('仓库已存在。');
} catch {
  const repo = await api('/user/repos', {
    method: 'POST',
    body: JSON.stringify({ name: REPO, description: 'Guo Jiayin 的个人博客 — Astro SSR on Cloudflare Pages (D1 + R2)', private: false, default_branch: 'main' }),
  });
  console.log(`已创建仓库: ${repo.full_name}`);
}

// 收集状态（初始推送 = 全部文件）
const files = walk('.');
console.log(`将同步 ${files.length} 个文件。`);

// 取远端当前 head（可能不存在）
let headSha = null;
try {
  const head = await api(`/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`);
  headSha = head.object.sha;
} catch {
  console.log('远端还没有 main 分支，先放一个初始 README 提交（空仓库不能直接收 blob）…');
  await api(`/repos/${OWNER}/${REPO}/contents/README.md`, {
    method: 'PUT',
    body: JSON.stringify({
      message: 'init: repository',
      content: Buffer.from(`# ${REPO}\n\nGuo Jiayin 的个人博客仓库。代码将随后推送。\n`).toString('base64'),
    }),
  });
  const head = await api(`/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`);
  headSha = head.object.sha;
}

// 已有分支 → 只推有改动的文件
let toPush = files;
let treeEntries = [];
if (headSha) {
  const commit = await api(`/repos/${OWNER}/${REPO}/git/commits/${headSha}`);
  const baseTree = commit.tree.sha;
  const tree = await api(`/repos/${OWNER}/${REPO}/git/trees/${baseTree}?recursive=1`);
  const existing = new Map((tree.tree || []).filter((t) => t.type === 'blob').map((t) => [t.path, t.sha]));
  const localHash = execSync(`git hash-object ${files.map((f) => `"${f}"`).join(' ')}`, { encoding: 'utf8' })
    .trim()
    .split('\n');
  const changed = [];
  const unchanged = [];
  files.forEach((f, i) => {
    if (existing.get(f) === localHash[i]) unchanged.push({ path: f, sha: localHash[i], mode: '100644', type: 'blob' });
    else changed.push(f);
  });
  treeEntries = unchanged;
  toPush = changed;
  console.log(`有改动：${changed.length} 个文件。`);
}

for (const p of toPush) {
  const blob = await api(`/repos/${OWNER}/${REPO}/git/blobs`, {
    method: 'POST',
    body: JSON.stringify({ content: readFileSync(p).toString('base64'), encoding: 'base64' }),
  });
  treeEntries.push({ path: p, sha: blob.sha, mode: '100644', type: 'blob' });
  console.log(`blob ${p} -> ${blob.sha.slice(0, 7)}`);
}

const newTree = await api(`/repos/${OWNER}/${REPO}/git/trees`, {
  method: 'POST',
  body: JSON.stringify({ base_tree: headSha ? (await api(`/repos/${OWNER}/${REPO}/git/commits/${headSha}`)).tree.sha : undefined, tree: treeEntries }),
});
const newCommit = await api(`/repos/${OWNER}/${REPO}/git/commits`, {
  method: 'POST',
  body: JSON.stringify({
    message: MSG,
    tree: newTree.sha,
    parents: headSha ? [headSha] : [],
    author: { name: 'vobl1999', email: 'maimaidx@hotmail.com', date: new Date().toISOString() },
    committer: { name: 'vobl1999', email: 'maimaidx@hotmail.com', date: new Date().toISOString() },
  }),
});
if (headSha) {
  await api(`/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`, { method: 'PATCH', body: JSON.stringify({ sha: newCommit.sha, force: false }) });
} else {
  await api(`/repos/${OWNER}/${REPO}/git/refs`, { method: 'POST', body: JSON.stringify({ ref: `refs/heads/${BRANCH}`, sha: newCommit.sha }) });
}
console.log(`✅ 远端 main 已更新: ${newCommit.sha.slice(0, 7)}`);
