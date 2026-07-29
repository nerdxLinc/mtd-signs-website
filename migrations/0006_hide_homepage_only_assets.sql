-- Homepage presentation assets must never appear in public portfolio listings.
-- They remain stored because the homepage still uses them directly.
UPDATE portfolio_images
SET is_hidden = 1,
    updated_at = CURRENT_TIMESTAMP
WHERE LOWER(source_filename) IN (
  'after van(1).jpg',
  'after-truck.jpg',
  'barry-signature.png',
  'before van(1).jpg',
  'before-truck.jpg'
);
