/**
 * 博客站配置 —— blog.vobl.cn（voblog / 沃博客）
 * 白色 + 浅蓝主题、圆润字体（Nunito / 幼圆）
 */
export const SITE = {
  name: 'voblog',
  nameZh: '沃博客',
  title: 'voblog', // 站点标题（不含多余标签）
  url: 'https://blog.vobl.cn',
  description: '沃博客（voblog）—— 郭嘉胤的博客：摄影、观看与生活的随笔。',
  // 回到个人主页（作品集 www.vobl.cn）
  portfolioUrl: 'https://www.vobl.cn',
  portfolioLabel: '回到主页',
  email: 'gjy@vobl.cn',
  // 每页文章数
  pageSize: 10,
} as const;
