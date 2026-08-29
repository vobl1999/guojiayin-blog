const B = 'https://blogb-dll.pages.dev';
(async () => {
  const post = await fetch(`${B}/post/sony-2026-awards`);
  const t = await post.text();
  console.log('post en:', post.status, '| media refs:', (t.match(/\/media\/posts\/sony/g) || []).length);

  const zh = await fetch(`${B}/post/sony-2026-zh`);
  console.log('post zh:', zh.status);

  const img = await fetch(`${B}/media/posts/sony-0001.webp`);
  console.log('media img:', img.status, img.headers.get('content-type'));

  const home = await (await fetch(`${B}/`)).text();
  console.log('home lists posts:', home.includes('sony-2026') || home.includes('索尼'));

  const rss = await (await fetch(`${B}/rss.xml`)).text();
  console.log('rss items:', (rss.match(/<item>/g) || []).length);

  const user = await fetch(`${B}/u/jiayin`);
  console.log('user page:', user.status);
})();
