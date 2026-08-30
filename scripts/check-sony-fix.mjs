const B = 'https://blog.vobl.cn';
(async () => {
  const home = await (await fetch(B + '/')).text();
  console.log('首页无 frontmatter:', !home.includes('description:') && !home.includes('lang: zh'));

  const en = await (await fetch(B + '/post/sony-2026-awards')).text();
  console.log('EN 文章页无 frontmatter:', !en.includes('title: Sony 2026') && !en.includes('lang: en'));
  console.log('EN 正文正常:', en.includes('Entry in the Sony 2026'));

  const zh = await (await fetch(B + '/post/sony-2026-zh')).text();
  console.log('ZH 文章页无 frontmatter:', !zh.includes('description: 参加索尼'));
  console.log('ZH 正文正常:', zh.includes('报名参加了索尼'));
})();
