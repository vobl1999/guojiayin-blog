// 建 CNAME（token/zone 走环境变量；该 token 需要 Zone DNS Edit 权限）
const T = process.env.CLOUDFLARE_API_TOKEN || '';
const zoneId = process.env.CLOUDFLARE_ZONE_ID || '';
(async () => {
  const r = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${T}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'CNAME', name: 'blog', content: 'blogb-dll.pages.dev', proxied: false, ttl: 1 }),
  });
  const j = await r.json();
  console.log('status:', r.status, JSON.stringify(j.errors || { id: j.result?.id, name: j.result?.name, content: j.result?.content }).slice(0, 200));
})();
