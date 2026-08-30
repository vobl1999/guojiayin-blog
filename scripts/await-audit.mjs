// 把所有 audit( 调用改成 await audit(（audit 现在是 async）
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const files = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full);
    else if (/\.(ts|astro)$/.test(full)) files.push(full);
  }
}
walk('src/pages/api');

for (const f of files) {
  let s = readFileSync(f, 'utf8');
  const updated = s.replace(/(?<![.\w])(?<!await )audit\(/g, 'await audit(');
  if (updated !== s) {
    writeFileSync(f, updated);
    console.log('updated:', f);
  }
}
