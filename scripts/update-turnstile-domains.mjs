// 给现有 Turnstile widget 添加主站域名（www.vobl.cn / vobl.cn）
// 注意：当前 token 无 Turnstile 写权限（403），此脚本仅留作参考
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
  const list = await api(`/accounts/${A}/challenges/widgets`);
  console.log('list:', list.status, list.success);
  const widget = (list.result || []).find((w) => (w.domains || []).includes('blog.vobl.cn'));
  if (!widget) {
    console.log('未找到 blog 的 widget');
    return;
  }
  console.log('widget:', widget.name, '| sitekey:', widget.sitekey, '| domains:', widget.domains);
  const domains = [...new Set([...(widget.domains || []), 'www.vobl.cn', 'vobl.cn'])];
  const patch = await api(`/accounts/${A}/challenges/widgets/${widget.id}`, {
    method: 'PUT',
    body: JSON.stringify({ domains }),
  });
  console.log('update:', patch.status, patch.success ? JSON.stringify(patch.result?.domains) : JSON.stringify(patch.errors));
})();
