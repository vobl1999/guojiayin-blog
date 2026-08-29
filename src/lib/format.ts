/** 时间/展示格式化 */
export function fmtDate(ms: number | string | null | undefined): string {
  const t = typeof ms === 'string' ? Number(ms) : ms;
  if (!t) return '';
  const d = new Date(t);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fmtDateTime(ms: number | string | null | undefined): string {
  const t = typeof ms === 'string' ? Number(ms) : ms;
  if (!t) return '';
  const d = new Date(t);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${fmtDate(t)} ${hh}:${mm}`;
}

/** 阅读时长估算（中文约 400 字/分钟） */
export function readMinutes(md: string): number {
  const chars = md.replace(/\s+/g, '').length;
  return Math.max(1, Math.round(chars / 400));
}

export function avatarUrl(key: string | null | undefined): string | null {
  return key ? `/media/${key}` : null;
}
