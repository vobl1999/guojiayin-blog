import rss from '@astrojs/rss';
import { env } from '../lib/db';
import { listAllPublished } from '../lib/posts';
import { SITE } from '../config/site';
import type { APIRoute } from 'astro';

export const GET: APIRoute = async (context) => {
  const e = env(context.locals.runtime);
  const posts = await listAllPublished(e);
  return rss({
    title: SITE.title,
    description: SITE.description,
    site: context.site ?? SITE.url,
    items: posts.map((p) => ({
      title: p.title,
      description: p.excerpt,
      link: `/post/${p.slug}`,
      pubDate: new Date(p.published_at ?? p.created_at),
      categories: p.tags,
    })),
  });
};
