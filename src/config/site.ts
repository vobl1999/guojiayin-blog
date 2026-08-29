/**
 * 博客站配置 —— blog.vobl.cn
 * 与主站（www.vobl.cn）共用设计语言：Fraunces + Inter、暖纸色调、金色点缀
 */
export const SITE = {
  name: 'Guo Jiayin',
  nameZh: '郭嘉胤',
  title: 'Guo Jiayin — Journal', // 站点头部标题
  url: 'https://blog.vobl.cn',
  description: '郭嘉胤的博客：摄影、观看与生活的随笔。',
  // 回到个人主页（作品集 www.vobl.cn）的按钮
  portfolioUrl: 'https://www.vobl.cn',
  portfolioLabel: '回到主页',
  email: 'gjy@vobl.cn',
  // 每页文章数
  pageSize: 10,
} as const;
