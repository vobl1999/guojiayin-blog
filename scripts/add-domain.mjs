// 添加 Pages 自定义域名 + 检查 DNS（token/account 走环境变量）
const T = process.env.CLOUDFLARE_API_TOKEN || '';
const A = process.env.CLOUDFLARE_ACCOUNT_ID || '';
const api = async (path, opts = {}) => {
  const r = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${T}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  const j = await r.json();
  return { status: r.status, ...j };
};

(async () => {
  // 1) 给 Pages 项目添加自定义域名
  const add = await api(`/accounts/${A}/pages/projects/blogb/domains`, {
    method: 'POST',
    body: JSON.stringify({ name: 'blog.vobl.cn' }),
  });
  console.log('add domain:', add.status, JSON.stringify(add.errors || add.result).slice(0, 200));

  // 2) 查 zone id
  const zone = await api('/zones?name=vobl.cn');
  const zoneId = zone.result?.[0]?.id;
  console.log('zone:', zoneId);

  // 3) 建 CNAME 记录（proxy off —— Pages 要求 DNS-only 或按需代理）
  const rec = await api(`/zones/${zoneId}/dns_records`, {
    method: 'POST',
    body: JSON.stringify({ type: 'CNAME', name: 'blog', content: 'blogb-dll.pages.dev', proxied: false, ttl: 1 }),
  });
  console.log('dns:', rec.status, JSON.stringify(rec.errors || { id: rec.result?.id, name: rec.result?.name }).slice(0, 200));
})();
