// 用 DNS token 修复 blog.vobl.cn 记录：删错误 A 记录，建 CNAME → blogb-dll.pages.dev
const T = process.env.DNS_TOKEN || '';
const zoneId = process.env.CLOUDFLARE_ZONE_ID || '';

const api = async (path, opts = {}) => {
  const r = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${T}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  const j = await r.json();
  return { status: r.status, ...j };
};

(async () => {
  // 1) 列出 blog.vobl.cn 现有记录
  const list = await api(`/zones/${zoneId}/dns_records?name=blog.vobl.cn`);
  console.log('list status:', list.status);
  if (!list.success) {
    console.log('LIST FAIL:', JSON.stringify(list.errors));
    return;
  }
  for (const rec of list.result || []) {
    console.log(`- ${rec.type} ${rec.name} -> ${rec.content} (id=${rec.id})`);
  }

  // 2) 删除 A 记录
  for (const rec of list.result || []) {
    if (rec.type === 'A') {
      const del = await api(`/zones/${zoneId}/dns_records/${rec.id}`, { method: 'DELETE' });
      console.log('delete A:', del.status, del.success ? 'ok' : JSON.stringify(del.errors));
    }
  }

  // 3) 新建 CNAME（无则建）
  const hasCname = (list.result || []).some((r) => r.type === 'CNAME');
  if (!hasCname) {
    const add = await api(`/zones/${zoneId}/dns_records`, {
      method: 'POST',
      body: JSON.stringify({ type: 'CNAME', name: 'blog', content: 'blogb-dll.pages.dev', proxied: false, ttl: 1 }),
    });
    console.log('add CNAME:', add.status, add.success ? `ok id=${add.result?.id}` : JSON.stringify(add.errors));
  } else {
    console.log('CNAME 已存在');
  }
})();
