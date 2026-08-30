-- 文章语言区分：英文界面只显示英文文章，中文界面只显示中文文章
ALTER TABLE posts ADD COLUMN lang TEXT NOT NULL DEFAULT 'zh';

UPDATE posts SET lang = 'en' WHERE slug = 'sony-2026-awards';
UPDATE posts SET lang = 'zh' WHERE slug = 'sony-2026-zh';
