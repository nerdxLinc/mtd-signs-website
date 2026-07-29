-- These are homepage presentation assets, not portfolio work. Keep their
-- stored files, but remove the imported R2 copies from every public portfolio
-- and Archive surface.
UPDATE portfolio_images
SET is_hidden = 1,
    updated_at = CURRENT_TIMESTAMP
WHERE id IN (
  '1554672c-9498-4636-8db4-06198699f6f4',
  '3f7b4f11-fb05-44a4-a364-f801245ed8f9',
  '9af24a15-bc5e-47c6-8412-0c4dc50ff6d2',
  'b23c4c52-3b23-42ac-9059-b81817a143c1',
  'db57490a-45e6-49d7-bfe2-f31545180542'
)
OR LOWER(source_filename) IN (
  'founder-shop.jpg',
  'leona-kemper-dentist-sign.jpg',
  'mtd-signs-website/src/assets/founder-shop.jpg',
  'mtd-signs-website/src/assets/leona-kemper-dentist-sign.jpg',
  'mtd-signs-website/src/assets/problem-install.jpg',
  'mtd-signs-website/src/assets/problem-shop.jpg',
  'mtd-signs-website/src/assets/problem-sketch.jpg',
  'problem-install.jpg',
  'problem-shop.jpg',
  'problem-sketch.jpg',
  'renamed/leona-kemper-dentist-sign.jpg',
  'process-blue.jpg',
  'process-grey.jpg',
  'process-orange.jpg'
);
