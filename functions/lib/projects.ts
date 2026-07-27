// Filename-derived project families keep import friction low. The name before
// a view/deliverable suffix is the project; keys ignore case and separators.
const projectSuffixes = new Set([
  "after", "angle", "back", "banner", "before", "close", "closeup", "copy", "detail", "display", "driver", "exterior",
  "fleet", "front", "image", "install", "installation", "installed", "interior", "left", "logo", "mockup", "monument", "night",
  "passenger", "photo", "pylon", "rear", "render", "right", "side", "sign", "signage", "trailer", "truck", "van", "vehicle",
  "view", "wall", "window", "wrap",
]);

function filenameWords(value: string, includeDirectories = false) {
  const filename = includeDirectories ? value : (value.split(/[\\/]/).pop() ?? value);
  return filename
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(/[^a-z0-9]+/i)
    .filter(Boolean);
}

export function normalizeProjectKey(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function projectFamilyFromWords(words: string[]) {
  const firstDescriptor = words.findIndex((word, index) => index > 0 && (projectSuffixes.has(word.toLowerCase()) || /^\d+$/.test(word)));
  const projectWords = words.slice(0, firstDescriptor > 0 ? firstDescriptor : words.length);
  const label = projectWords.map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`).join(" ").trim();
  const key = normalizeProjectKey(label);
  if (!key || projectSuffixes.has(key) || key.length < 3) return null;
  return { key, label };
}

// ZIP packages often place every image inside a generic folder (for example,
// "renamed/"). A folder is not part of the client's name, so derive project
// families from the actual filename only.
export function projectFamilyFromFilename(filename: string) {
  return projectFamilyFromWords(filenameWords(filename));
}

function legacyProjectFamilyFromPath(filename: string) {
  return projectFamilyFromWords(filenameWords(filename, true));
}

export function projectFamilyFromLabel(label: string) {
  const cleanLabel = label.trim().replace(/\s+/g, " ");
  const key = normalizeProjectKey(cleanLabel);
  if (!key || key.length < 3) return null;
  return { key, label: cleanLabel };
}

export function projectFromRow(row: any) {
  const derived = projectFamilyFromFilename(String(row.source_filename ?? ""));
  const legacy = legacyProjectFamilyFromPath(String(row.source_filename ?? ""));
  const storedKey = row.project_key ? String(row.project_key) : undefined;
  const storedLabel = row.project_label ? String(row.project_label) : undefined;

  // Older imports derived a family from the complete ZIP path. When that
  // stored value exactly matches the old path-derived key, prefer the new
  // filename-only family so all of a client's work stays together.
  const storedIsLegacyPathValue = Boolean(derived && legacy && storedKey === legacy.key && storedKey !== derived.key);
  return {
    key: !storedIsLegacyPathValue && storedKey ? storedKey : derived?.key,
    label: !storedIsLegacyPathValue && storedLabel ? storedLabel : derived?.label,
  };
}

