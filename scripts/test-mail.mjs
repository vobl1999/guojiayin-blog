// 生产环境实测：给 gjy@vobl.cn 发送登录验证码（真实邮件）
const B = 'https://blogb-dll.pages.dev';
(async () => {
  const r = await fetch(`${B}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'code', step: 'send', email: 'gjy@vobl.cn' }),
  });
  const t = await r.text();
  console.log('status:', r.status, '| body:', t.slice(0, 300));
})();
