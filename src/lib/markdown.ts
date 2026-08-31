/**
 * Markdown 渲染（markdown-it）
 * html: false → 原文里的 HTML 会被转义，天然防 XSS；
 * markdown-it 默认 validateLink 也会拦截 javascript: 等危险链接。
 * 渲染后给 h2/h3 注入 id，供文章页左侧目录跳转。
 */
import MarkdownIt from 'markdown-it';

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
});

function slugifyHeading(text: string): string {
  const s = text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return s || 'sec';
}

export function renderMarkdown(source: string): string {
  const html = md.render(source || '');
  // 给 h2/h3 注入 id（标题为纯文本时才处理）
  return html.replace(/<h([23])>([^<]+)<\/h\1>/g, (_m, tag: string, text: string) => {
    return `<h${tag} id="${slugifyHeading(text)}">${text}</h${tag}>`;
  });
}

/** 生成摘要（纯文本，来自 HTML 剥离标签） */
export function makeExcerpt(html: string, len = 140): string {
  const text = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > len ? `${text.slice(0, len)}…` : text;
}

/** 从渲染后的 HTML 提取目录（h2/h3） */
export function extractToc(html: string): { id: string; text: string; level: 2 | 3 }[] {
  const toc: { id: string; text: string; level: 2 | 3 }[] = [];
  const re = /<h([23]) id="([^"]+)">([^<]+)<\/h\1>/g;
  const decode = (s: string) =>
    s
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    toc.push({ id: m[2], text: decode(m[3]), level: Number(m[1]) as 2 | 3 });
  }
  return toc;
}
