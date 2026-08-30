const B = 'https://blog.vobl.cn';
(async () => {
  // 1) 无通行 cookie 的页面请求 → 302 到 /gate
  const home = await fetch(B + '/', { redirect: 'manual', headers: { accept: 'text/html' } });
  console.log('home no-cookie:', home.status, '->', home.headers.get('location'));

  // 2) /gate 页面本身可访问，且渲染 Turnstile
  const gate = await fetch(B + '/gate', { headers: { accept: 'text/html' } });
  const gt = await gate.text();
  console.log('gate page:', gate.status, '| widget:', gt.includes('cf-turnstile'), '| sitekey:', gt.includes('0x4AAAAAAEiACKAD2IxsS8OL'));

  // 3) 搜索引擎爬虫免验证
  const crawler = await fetch(B + '/', { redirect: 'manual', headers: { accept: 'text/html', 'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' } });
  console.log('googlebot:', crawler.status);

  // 4) 静态资源与 API 不拦截
  const css = await fetch(B + '/favicon.svg');
  console.log('favicon:', css.status);
  const api = await fetch(B + '/rss.xml', { redirect: 'manual' });
  console.log('rss:', api.status);

  // 5) /api/gate 无 token → 400
  const bad = await fetch(B + '/api/gate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
  console.log('api/gate no token:', bad.status, await bad.text());
})();
