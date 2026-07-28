function comparableFilenameStem(filename: string) {
  const basename = filename.split(/[\\/]/).pop() ?? filename;
  return basename
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/, "")
    // Strip only suffixes that operating systems and editors commonly add to
    // a copied file. A plain trailing number is intentionally retained because
    // portfolio photographers often number genuinely different views.
    .replace(/\s*\(\s*(?:copy\s*)?\d+\s*\)$/, "")
    .replace(/(?:[-_\s]+)(?:copy|duplicate|dup)(?:[-_\s]*\d+)?$/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function likelySameName(first: string, second: string) {
  const a = comparableFilenameStem(first);
  const b = comparableFilenameStem(second);
  if (!a || a !== b) return false;

  // Generic names such as "logo.jpg" or "image.png" occur across unrelated
  // clients. Only a descriptive, equivalent filename is useful as a
  // potential-duplicate signal; byte-for-byte identity remains hash-based.
  return a.length >= 12 || a.split(/\s+/).length >= 2;
}
