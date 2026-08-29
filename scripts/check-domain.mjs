// 查询 Pages 自定义域名证书状态
const T = process.env.CLOUDFLARE_API_TOKEN || '';
const A = process.env.CLOUDFLARE_ACCOUNT_ID || '';
const TOKEN = T;
(async () => {
  const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${A}/pages/projects/blogb/domains`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  const j = await r.json();
  console.log('status:', r.status, JSON.stringify(j.result || j.errors, null, 2).slice(0, 900));
})();
