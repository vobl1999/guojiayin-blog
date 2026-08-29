import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://blog.vobl.cn',
  output: 'server',
  trailingSlash: 'ignore',
  adapter: cloudflare({
    platformProxy: { enabled: true },
    imageService: 'compile',
  }),
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/admin') && !page.includes('/api/'),
    }),
  ],
  markdown: {
    shikiConfig: { theme: 'github-light' },
  },
  // 安全响应头由 Pages _headers 控制（见 public/_headers）
  vite: {
    build: {
      // 每个页面独立 chunk，避免整站 JS 一起加载
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          manualChunks: undefined,
        },
      },
    },
  },
});
