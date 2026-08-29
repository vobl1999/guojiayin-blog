// 用用户提供的验证码完成登录（生产），验证邮箱链路闭环
const B = 'https://blogb-dll.pages.dev';
(async () => {
  const r = await fetch(`${B}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'code', step: 'verify', email: 'gjy@vobl.cn', code: '888691' }),
  });
  const t = await r.text();
  console.log('verify status:', r.status, '| body:', t.slice(0, 200));
  const cookie = r.headers.get('set-cookie');
  console.log('session cookie:', cookie ? 'yes' : 'no');
  if (cookie) {
    const me = await fetch(`${B}/me`, { headers: { cookie: cookie.split(';')[0] } });
    const mt = await me.text();
    console.log('me page:', me.status, '| admin link present:', mt.includes('/admin'));
  }
})();
