const B = 'https://blog.vobl.cn';
const post = async (body) => {
  const r = await fetch(B + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { s: r.status, t: await r.text() };
};
(async () => {
  for (let i = 1; i <= 6; i++) {
    const r = await post({ mode: 'password', email: `ratetest${i}@vobl.cn`, password: 'badpass12345' });
    console.log(`attempt ${i}:`, r.s, r.t.slice(0, 60));
  }
})();
