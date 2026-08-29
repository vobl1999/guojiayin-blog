const BASE = 'http://localhost:4321';
(async () => {
  const r = await fetch(`${BASE}/post/hello-blog`, { redirect: 'manual' });
  console.log('status:', r.status, '| location:', r.headers.get('location') || '-');
  if (r.status === 200) {
    const t = await r.text();
    console.log('has <h1>:', t.includes('<h1'), '| has data-comments:', t.includes('data-comments'));
    console.log('slug text present:', t.includes('hello-blog'));
  }
})();
