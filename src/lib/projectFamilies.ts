import type { PortfolioImage } from "../types/portfolio";

// These describe a photograph or deliverable, rather than the customer/project
// name that appears at the start of MTD's supplied filenames.
const projectSuffixes = new Set([
  "after", "angle", "back", "banner", "before", "close", "closeup", "copy", "detail", "display", "driver", "exterior",
  "fleet", "front", "image", "install", "installation", "installed", "interior", "left", "logo", "mockup", "monument", "night",
  "passenger", "photo", "pylon", "rear", "render", "right", "side", "sign", "signage", "trailer", "truck", "van", "vehicle",
  "view", "wall", "window", "wrap",
]);

function filenameWords(value: string) {
  return value
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(/[^a-z0-9]+/i)
    .filter(Boolean);
}

export function normalizeProjectKey(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/gi, "").toLowerCase();
}

export function projectFamilyFromFilename(filename: string) {
  const words = filenameWords(filename);
  const firstDescriptor = words.findIndex((word, index) => index > 0 && (projectSuffixes.has(word.toLowerCase()) || /^\d+$/.test(word)));
  const projectWords = words.slice(0, firstDescriptor > 0 ? firstDescriptor : words.length);
  const label = projectWords.map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`).join(" ").trim();
  const key = normalizeProjectKey(label);
  if (!key || projectSuffixes.has(key) || key.length < 3) return null;
  return { key, label };
}

export function projectLabelFromKey(key: string) {
  return key.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function addProjectFamilies(images: PortfolioImage[]) {
  const enriched = images.map((image) => {
    const derived = projectFamilyFromFilename(image.filename);
    const projectKey = image.projectKey ?? derived?.key;
    const projectLabel = image.projectLabel ?? derived?.label;
    return { ...image, projectKey, projectLabel };
  });
  const counts = new Map<string, number>();
  for (const image of enriched) {
    if (image.projectKey) counts.set(image.projectKey, (counts.get(image.projectKey) ?? 0) + 1);
  }
  return enriched.map((image) => ({ ...image, projectCount: image.projectKey ? counts.get(image.projectKey) ?? 0 : 0 }));
}
