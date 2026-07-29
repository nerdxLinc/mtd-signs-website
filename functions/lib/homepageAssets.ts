const homepageOnlyFilenames = new Set([
  "after van(1).jpg",
  "after-truck.jpg",
  "barry-signature.png",
  "before van(1).jpg",
  "before-truck.jpg",
]);

export function isHomepageOnlyAsset(filename: unknown) {
  if (typeof filename !== "string") return false;
  const basename = filename.replace(/\\/g, "/").split("/").pop()?.trim().toLowerCase();
  return basename ? homepageOnlyFilenames.has(basename) : false;
}
