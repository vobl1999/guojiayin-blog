// 把 SMTP 配置写入 Pages 生产密钥（值来自环境变量，绝不硬编码进仓库）
// 用法（PowerShell）：
//   $env:SMTP_HOST='smtp.larksuite.com'; $env:SMTP_PORT='465'
//   $env:SMTP_USER='no-reply@vobl.cn'; $env:SMTP_PASS='授权码'; $env:SMTP_FROM='no-reply@vobl.cn'
//   node scripts/set-smtp.mjs
import { execSync } from 'node:child_process';

const T = process.env.CLOUDFLARE_API_TOKEN || '';
const A = process.env.CLOUDFLARE_ACCOUNT_ID || '';
const secrets = {
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: process.env.SMTP_PORT || '',
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  SMTP_FROM: process.env.SMTP_FROM || '',
};

if (!T || !A || Object.values(secrets).some((v) => !v)) {
  console.error('缺少环境变量：CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID / SMTP_*');
  process.exit(1);
}

for (const [name, value] of Object.entries(secrets)) {
  try {
    execSync(`npx wrangler pages secret put ${name} --project-name blogb`, {
      input: value + '\n',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, CLOUDFLARE_API_TOKEN: T, CLOUDFLARE_ACCOUNT_ID: A },
    });
    console.log(`✓ ${name} 已设置`);
  } catch (e) {
    console.log(`✗ ${name} 失败:`, e.message.slice(0, 120));
  }
}
