// 诊断：列出 zone 全部记录 + 找出 blog A 记录到底在哪
const T = process.env.DNS_TOKEN || '';
const api = async (path, opts = {}) => {
  const r = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${T}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  const j = await r.json();
  return { status: r.status, ...j };
};

(async () => {
  // 这个 token 能看到哪些 zone？
  const zones = await api('/zones?name=vobl.cn&per_page=50');
  console.log('zones:', zones.status, zones.success ? `count=${zones.result?.length}` : JSON.stringify(zones.errors));
  for (const z of zones.result || []) {
    console.log('zone:', z.name, z.id, 'status:', z.status);
    const recs = await api(`/zones/${z.id}/dns_records?per_page=100`);
    console.log(`  records api: ${recs.status}, success=${recs.success}, count=${recs.result?.length}`);
    for (const r of recs.result || []) {
      if (r.name.includes('vobl') || r.name.includes('blog')) {
        console.log(`   - ${r.type} ${r.name} -> ${r.content} (proxied=${r.proxied}, id=${r.id})`);
      }
    }
  }
})();
