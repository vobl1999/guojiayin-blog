const B = 'https://blog.vobl.cn';
(async () => {
  // 1) 登录页应渲染 Turnstile 组件
  const login = await (await fetch(B + '/login')).text();
  console.log('login widget present:', login.includes('cf-turnstile'));
  console.log('sitekey present:', login.includes('0x4AAAAAAEiACKAD2IxsS8OL'));
  console.log('api.js present:', login.includes('challenges.cloudflare.com/turnstile'));

  const reg = await (await fetch(B + '/register')).text();
  console.log('register widget present:', reg.includes('cf-turnstile'));

  // 2) 后端现在应强制校验：无 token → 400
  const r = await fetch(B + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'password', email: 'gjy@vobl.cn', password: 'x'.repeat(10) }),
  });
  console.log('no-token login:', r.status, await r.text());
})();
