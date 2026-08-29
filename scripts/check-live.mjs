const B = 'https://blog.vobl.cn';
(async () => {
  for (let i = 1; i <= 8; i++) {
    try {
      const r = await fetch(B + '/', { redirect: 'manual' });
      console.log(`try ${i}: status ${r.status}`);
      if (r.status === 200) {
        const t = await r.text();
        console.log('lang toggle:', t.includes('data-lang-toggle'), '| i18n:', t.includes('data-i18n'), '| JOURNAL gone:', !t.includes('>JOURNAL<'));
        process.exit(0);
      }
    } catch (e) {
      console.log(`try ${i}: ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 15000));
  }
  process.exit(1);
})();
