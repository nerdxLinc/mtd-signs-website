CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  display_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS portfolio_imports (
  id TEXT PRIMARY KEY,
  source_name TEXT NOT NULL,
  imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  imported_by TEXT NOT NULL,
  image_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS portfolio_images (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES categories(id),
  status TEXT NOT NULL CHECK (status IN ('featured', 'archive')),
  display_rank INTEGER NOT NULL DEFAULT 100,
  is_category_cover INTEGER NOT NULL DEFAULT 0,
  is_hidden INTEGER NOT NULL DEFAULT 1,
  r2_key TEXT NOT NULL UNIQUE,
  source_filename TEXT NOT NULL,
  source_zip TEXT,
  content_type TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  alt_text TEXT NOT NULL,
  import_id TEXT REFERENCES portfolio_imports(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS portfolio_images_public_idx ON portfolio_images(category_id, status, is_hidden, display_rank);
CREATE INDEX IF NOT EXISTS portfolio_images_hash_idx ON portfolio_images(content_hash);
CREATE INDEX IF NOT EXISTS portfolio_images_filename_idx ON portfolio_images(source_filename);

CREATE TABLE IF NOT EXISTS import_file_logs (
  id TEXT PRIMARY KEY,
  import_id TEXT NOT NULL REFERENCES portfolio_imports(id),
  filename TEXT NOT NULL,
  kind TEXT NOT NULL,
  content_preview TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS testimonials (
  id TEXT PRIMARY KEY,
  testimonial_text TEXT NOT NULL,
  client_name TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 0,
  display_order INTEGER NOT NULL DEFAULT 100,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS testimonials_public_idx ON testimonials(is_active, display_order);

INSERT OR IGNORE INTO categories (id, slug, label, display_order) VALUES
  ('vehicle-wraps-fleet-graphics', 'vehicle-wraps-fleet-graphics', 'Vehicle Wraps & Fleet Graphics', 1),
  ('logo-identity-design', 'logo-identity-design', 'Logo & Identity Design', 2),
  ('commercial-branding', 'commercial-branding', 'Commercial Branding', 3),
  ('church-ministry-graphics', 'church-ministry-graphics', 'Church & Ministry Graphics', 4),
  ('public-safety-graphics', 'public-safety-graphics', 'Public Safety Graphics', 5),
  ('specialty-projects', 'specialty-projects', 'Specialty Projects', 6);
