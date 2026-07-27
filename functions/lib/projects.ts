// Filename-derived project families keep import friction low. The name before
// a view/deliverable suffix is the project; keys ignore case and separators.
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

export function projectFamilyFromLabel(label: string) {
  const cleanLabel = label.trim().replace(/\s+/g, " ");
  const key = normalizeProjectKey(cleanLabel);
  if (!key || key.length < 3) return null;
  return { key, label: cleanLabel };
}

export function projectFromRow(row: any) {
  const derived = projectFamilyFromFilename(String(row.source_filename ?? ""));
  return {
    key: row.project_key ? String(row.project_key) : derived?.key,
    label: row.project_label ? String(row.project_label) : derived?.label,
  };
}
