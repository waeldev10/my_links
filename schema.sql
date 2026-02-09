-- مخطط مبدئي لجداول قاعدة البيانات (SQL)
-- هذا الملف للاستخدام مستقبلاً مع أي سيرفر SQL (MySQL / PostgreSQL / SQLite...)
-- ملاحظة: GitHub Pages لا يدعم تشغيل SQL مباشرة، لذلك الواجهة الحالية تعمل على بيانات ثابتة في المتصفح.

CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name_ar VARCHAR(100) NOT NULL UNIQUE,
  name_en VARCHAR(100)
);

CREATE TABLE links (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  category_id INTEGER REFERENCES categories (id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE link_tags (
  link_id INTEGER REFERENCES links (id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES tags (id) ON DELETE CASCADE,
  PRIMARY KEY (link_id, tag_id)
);

