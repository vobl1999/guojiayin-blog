/**
 * Markdown 渲染（markdown-it）
 * html: false → 原文里的 HTML 会被转义，天然防 XSS；
 * markdown-it 默认 validateLink 也会拦截 javascript: 等危险链接。
 */
import MarkdownIt from 'markdown-it';

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
});

export function renderMarkdown(source: string): string {
  return md.render(source || '');
}

/** 生成摘要（纯文本，来自 HTML 剥离标签） */
export function makeExcerpt(html: string, len = 140): string {
  const text = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > len ? `${text.slice(0, len)}…` : text;
}
