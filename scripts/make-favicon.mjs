// 用连笔字形生成 favicon（白色圆角底 + 渐变字形）
import { readFileSync, writeFileSync } from 'node:fs';

const svg = readFileSync('src/assets/logo-mark.svg', 'utf8');
const d = svg.match(/<path[^>]*d="([^"]+)"/)[1];
// 字形 bbox: 317.6, 43.3 → 720.1, 217.8（402.5 x 174.5）
// 放到 480x208 画布（白底圆角），字形平移缩放至合适位置
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 208">
  <rect x="8" y="8" width="464" height="192" rx="46" fill="#ffffff"/>
  <defs>
    <linearGradient id="g" x1="317.6" y1="43.3" x2="720.1" y2="217.8" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#8ec5f7"/>
      <stop offset="0.55" stop-color="#5b9bd5"/>
      <stop offset="1" stop-color="#2f6fd0"/>
    </linearGradient>
  </defs>
  <g transform="translate(-278.6 -26.3)">
    <path fill="url(#g)" d="${d}"/>
  </g>
</svg>
`;
writeFileSync('public/favicon.svg', favicon);
console.log('favicon written, path len:', d.length);
