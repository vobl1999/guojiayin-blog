const B = 'https://blogb-dll.pages.dev';
(async () => {
  const t = await (await fetch(B + '/')).text();
  const m = t.match(/href="(\/_astro\/[^"]+\.css)"/);
  console.log('css:', m ? m[1] : 'none');
  if (m) {
    const c = await (await fetch(B + m[1])).text();
    console.log('glass in css:', c.includes('backdrop-filter'));
    console.log('fallback in css:', c.includes('@supports not'));
    console.log('legacy in css:', c.includes('data-legacy'));
  }
})();
