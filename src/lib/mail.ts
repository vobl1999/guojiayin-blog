/**
 * 邮件发送：验证码邮件（Lark / 飞书邮箱 SMTP）
 *
 * - 生产（Cloudflare Workers）：用 cloudflare:sockets 直连 SMTP（465 隐式 TLS / 587 STARTTLS）
 * - 本地开发：无 socket 环境，把验证码打印到控制台（开发模式），接口返回成功便于联调
 */
import type { DBEnv } from './db';

export interface MailConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

export function mailConfig(e: DBEnv): MailConfig | null {
  if (!e.SMTP_HOST || !e.SMTP_USER || !e.SMTP_PASS) return null;
  return {
    host: e.SMTP_HOST,
    port: Number(e.SMTP_PORT || 465),
    user: e.SMTP_USER,
    pass: e.SMTP_PASS,
    from: e.SMTP_FROM || e.SMTP_USER,
  };
}

export interface SendResult {
  ok: boolean;
  dev?: boolean;
  error?: string;
}

export async function sendVerifyCode(
  e: DBEnv,
  to: string,
  code: string,
  purpose: 'register' | 'login'
): Promise<SendResult> {
  const cfg = mailConfig(e);
  const subject =
    purpose === 'register' ? '【郭嘉胤的博客】注册验证码' : '【郭嘉胤的博客】登录验证码';
  const text =
    `你好，\n\n你的${purpose === 'register' ? '注册' : '登录'}验证码是：${code}\n` +
    `验证码 10 分钟内有效，请勿转发给他人。\n\n` +
    `如果不是你本人操作，请忽略这封邮件。\n— blog.vobl.cn`;

  if (!cfg) {
    if (import.meta.env?.DEV) {
      // 本地开发：没有 SMTP 配置也照常联调，验证码打印在控制台
      console.log(`[dev-mail] to=${to} code=${code}`);
      return { ok: true, dev: true };
    }
    return { ok: false, error: 'SMTP 未配置' };
  }

  if (import.meta.env?.DEV) {
    // 本地开发：打印验证码，不真发邮件
    console.log(`[dev-mail] to=${to} code=${code}`);
    return { ok: true, dev: true };
  }

  try {
    const ok = await smtpSend(cfg, to, subject, text);
    return ok ? { ok: true } : { ok: false, error: 'SMTP 发送失败' };
  } catch (err) {
    return { ok: false, error: String((err as Error)?.message ?? err) };
  }
}

/** 最小 SMTP 客户端（Workers TCP socket + TLS） */
async function smtpSend(cfg: MailConfig, to: string, subject: string, text: string): Promise<boolean> {
  // 动态导入：只有生产环境会走到这里；Vite dev 不解析 cloudflare:sockets
  const { connect } = await import(/* @vite-ignore */ 'cloudflare:sockets');
  const useStartTls = cfg.port === 587;
  const socket = connect(
    { hostname: cfg.host, port: cfg.port },
    { secureTransport: useStartTls ? 'starttls' : 'on', allowHalfOpen: false }
  );

  const reader = socket.readable.getReader();
  const writer = socket.writable.getWriter();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  let buf = '';
  async function readReply(expectCode?: number): Promise<number> {
    while (true) {
      if (buf.includes('\r\n')) {
        const idx = buf.indexOf('\r\n');
        const line = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        const code = parseInt(line.slice(0, 3), 10);
        if (line[3] === '-') continue; // 多行响应的中间行
        if (expectCode && code !== expectCode) {
          throw new Error(`SMTP ${code}: ${line}`);
        }
        return code;
      }
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
    }
    throw new Error('SMTP 连接意外关闭');
  }

  async function cmd(s: string, expect?: number): Promise<number> {
    await writer.write(encoder.encode(s + '\r\n'));
    return readReply(expect);
  }

  const b64 = (s: string) => btoa(unescape(encodeURIComponent(s)));

  try {
    await readReply(220);
    await cmd(`EHLO blog.vobl.cn`, 250);
    await cmd('AUTH LOGIN', 334);
    await cmd(b64(cfg.user), 334);
    await cmd(b64(cfg.pass), 235);
    await cmd(`MAIL FROM:<${cfg.from}>`, 250);
    await cmd(`RCPT TO:<${to}>`, 250);
    await cmd('DATA', 354);
    const body =
      `From: ${cfg.from}\r\n` +
      `To: ${to}\r\n` +
      `Subject: =?UTF-8?B?${b64(subject)}?=\r\n` +
      `Content-Type: text/plain; charset=utf-8\r\n` +
      `Content-Transfer-Encoding: base64\r\n\r\n` +
      `${b64(text).replace(/(.{76})/g, '$1\r\n')}\r\n.\r\n`;
    await writer.write(encoder.encode(body));
    await readReply(250);
    await cmd('QUIT', 221);
    return true;
  } finally {
    try {
      writer.releaseLock();
      reader.releaseLock();
      socket.close();
    } catch {}
  }
}
