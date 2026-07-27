-- Archive is the default destination for every imported image.
-- The live Admin endpoint also applies this recovery safely on first load,
-- so an existing Pages deployment receives the correction without a manual
-- database command.
UPDATE portfolio_images
SET is_hidden = 0,
    updated_at = CURRENT_TIMESTAMP
WHERE status = 'archive'
  AND is_hidden = 1;

