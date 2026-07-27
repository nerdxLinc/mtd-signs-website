-- Project families are automatic metadata derived from a source filename.
-- Existing rows remain safe: the application derives a temporary family until
-- a future import or an owner correction stores an explicit value.
ALTER TABLE portfolio_images ADD COLUMN project_key TEXT;
ALTER TABLE portfolio_images ADD COLUMN project_label TEXT;

CREATE INDEX IF NOT EXISTS portfolio_images_project_idx ON portfolio_images(project_key, is_hidden, display_rank);
