const T = process.env.CLOUDFLARE_API_TOKEN || '';
const A = process.env.CLOUDFLARE_ACCOUNT_ID || '';
(async () => {
  const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${A}/r2/buckets/blogb-assets/objects`, {
    headers: { Authorization: `Bearer ${T}` },
  });
  const j = await r.json();
  console.log('keys of result:', Object.keys(j.result || {}));
  console.log(JSON.stringify(j.result).slice(0, 500));
})();
