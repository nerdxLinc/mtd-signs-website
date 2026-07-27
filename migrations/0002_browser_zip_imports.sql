-- Browser-side ZIP imports: D1 stores only import progress, source records, and image metadata.
-- Original ZIP packages are never stored in R2 or uploaded to Pages Functions.
ALTER TABLE portfolio_imports ADD COLUMN completed_at TEXT;
ALTER TABLE portfolio_imports ADD COLUMN status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE portfolio_imports ADD COLUMN source_size INTEGER NOT NULL DEFAULT 0;
ALTER TABLE portfolio_imports ADD COLUMN uploaded_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE portfolio_imports ADD COLUMN skipped_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE portfolio_imports ADD COLUMN failed_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE portfolio_imports ADD COLUMN duplicate_count INTEGER NOT NULL DEFAULT 0;

PRAGMA foreign_keys = OFF;
CREATE TABLE portfolio_images_rebuilt (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES categories(id),
  status TEXT NOT NULL CHECK (status IN ('featured', 'archive')),
  display_rank INTEGER NOT NULL DEFAULT 100,
  is_category_cover INTEGER NOT NULL DEFAULT 0,
  is_hidden INTEGER NOT NULL DEFAULT 1,
  r2_key TEXT NOT NULL,
  source_filename TEXT NOT NULL,
  source_zip TEXT,
  content_type TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  source_size INTEGER,
  width INTEGER,
  height INTEGER,
  alt_text TEXT NOT NULL,
  import_id TEXT REFERENCES portfolio_imports(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO portfolio_images_rebuilt (id, category_id, status, display_rank, is_category_cover, is_hidden, r2_key, source_filename, source_zip, content_type, content_hash, width, height, alt_text, import_id, created_at, updated_at)
SELECT id, category_id, status, display_rank, is_category_cover, is_hidden, r2_key, source_filename, source_zip, content_type, content_hash, width, height, alt_text, import_id, created_at, updated_at
FROM portfolio_images;
DROP TABLE portfolio_images;
ALTER TABLE portfolio_images_rebuilt RENAME TO portfolio_images;
PRAGMA foreign_keys = ON;

CREATE INDEX IF NOT EXISTS portfolio_images_public_idx ON portfolio_images(category_id, status, is_hidden, display_rank);
CREATE INDEX IF NOT EXISTS portfolio_images_hash_idx ON portfolio_images(content_hash);
CREATE INDEX IF NOT EXISTS portfolio_images_filename_idx ON portfolio_images(source_filename);
CREATE INDEX IF NOT EXISTS portfolio_images_r2_key_idx ON portfolio_images(r2_key);

CREATE TABLE IF NOT EXISTS portfolio_import_items (
  id TEXT PRIMARY KEY,
  import_id TEXT NOT NULL REFERENCES portfolio_imports(id),
  source_filename TEXT NOT NULL,
  item_status TEXT NOT NULL DEFAULT 'pending',
  content_hash TEXT,
  source_size INTEGER,
  width INTEGER,
  height INTEGER,
  image_id TEXT REFERENCES portfolio_images(id),
  duplicate_kind TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(import_id, source_filename)
);
CREATE INDEX IF NOT EXISTS portfolio_import_items_status_idx ON portfolio_import_items(import_id, item_status);

CREATE TABLE IF NOT EXISTS import_source_records (
  id TEXT PRIMARY KEY,
  import_id TEXT NOT NULL REFERENCES portfolio_imports(id),
  source_zip TEXT NOT NULL,
  filename TEXT NOT NULL,
  kind TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(import_id, filename)
);

CREATE TABLE IF NOT EXISTS import_duplicate_reviews (
  id TEXT PRIMARY KEY,
  import_id TEXT NOT NULL REFERENCES portfolio_imports(id),
  import_item_id TEXT NOT NULL REFERENCES portfolio_import_items(id),
  duplicate_kind TEXT NOT NULL CHECK (duplicate_kind IN ('exact', 'potential')),
  -- Deliberately not foreign keys: an owner-approved decision can permanently
  -- remove either image while retaining the import decision record.
  existing_image_id TEXT NOT NULL,
  incoming_image_id TEXT,
  review_status TEXT NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'resolved')),
  resolution TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TEXT
);
CREATE INDEX IF NOT EXISTS import_duplicate_reviews_pending_idx ON import_duplicate_reviews(review_status, import_id);

UPDATE categories SET display_order = 4 WHERE id = 'public-safety-graphics';
UPDATE categories SET display_order = 5 WHERE id = 'church-ministry-graphics';
