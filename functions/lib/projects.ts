// Filename-derived project families keep import friction low. The name before
// a view/deliverable suffix is the project; keys ignore case and separators.
const projectSuffixes = new Set([
  "after", "angle", "back", "banner", "before", "close", "closeup", "copy", "detail", "display", "driver", "exterior",
  "design", "designs", "fleet", "front", "graphic", "graphics", "image", "install", "installation", "installed", "interior", "left", "logo", "mockup", "monument", "night",
  "passenger", "photo", "pylon", "rear", "render", "right", "side", "sign", "signage", "trailer", "truck", "van", "vehicle",
  "view", "wall", "wayfinding", "website", "window", "wrap",
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

function familyWordsFromFilename(filename: string) {
  const words = filenameWords(filename);
  const firstDescriptor = words.findIndex((word, index) => index > 0 && (projectSuffixes.has(word.toLowerCase()) || /^v?\d+$/i.test(word) || /^rev(?:ision)?\d*$/i.test(word)));
  return words.slice(0, firstDescriptor > 0 ? firstDescriptor : words.length);
}

function commonPrefixLength(first: string[], second: string[]) {
  const limit = Math.min(first.length, second.length);
  let count = 0;
  while (count < limit && normalizeProjectKey(first[count]) === normalizeProjectKey(second[count])) count += 1;
  return count;
}

function labelFromWords(words: string[]) {
  return words.map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`).join(" ").trim();
}

function compactFamilyKey(words: string[]) {
  return normalizeProjectKey(labelFromWords(words));
}

// ZIP packages often place every image inside a generic folder (for example,
// "renamed/"). A folder is not part of the client's name, so derive project
// families from the actual filename only.
export function projectFamilyFromFilename(filename: string) {
  return projectFamilyFromWords(familyWordsFromFilename(filename));
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

type ProjectFamily = { key?: string; label?: string };

/**
 * Resolve project families from the whole collection, rather than treating
 * each filename in isolation. This is what makes Taco Local / Taco-Local /
 * taco_local design files behave as one clickable project family.
 */
export function projectFamiliesForRows(rows: any[]) {
  const assignments = new Map<string, ProjectFamily>();
  const candidates = rows.map((row) => {
    const words = familyWordsFromFilename(String(row.source_filename ?? ""));
    const resolved = projectFromRow(row);
    const storedKey = row.project_key ? String(row.project_key) : undefined;
    const storedLabel = row.project_label ? String(row.project_label) : undefined;
    const explicit = Boolean(storedKey && storedLabel && resolved.key === storedKey && resolved.label === storedLabel);
    return { id: String(row.id), words, key: resolved.key, label: resolved.label, explicit };
  });
  const unique = [...new Map(candidates
    .filter((candidate): candidate is typeof candidate & { key: string; label: string } => Boolean(candidate.key && candidate.label))
    .map((candidate) => [candidate.key, candidate])).values()]
    .sort((first, second) => first.key.length - second.key.length);
  const canonicalByKey = new Map<string, ProjectFamily>();

  // Resolve separator variations and complete contained principal names once
  // per unique project key. This replaces the former row-by-row comparison,
  // which became too expensive as the portfolio grew.
  for (const candidate of unique) {
    if (candidate.explicit) {
      canonicalByKey.set(candidate.key, { key: candidate.key, label: candidate.label });
      continue;
    }
    const parent = unique.find((possible) =>
      possible.key !== candidate.key
      && possible.words.length >= 2
      && candidate.key.includes(possible.key));
    canonicalByKey.set(candidate.key, parent
      ? { key: parent.key, label: parent.label }
      : { key: candidate.key, label: candidate.label });
  }

  // Preserve the established two-word family rule for names such as
  // Taco Local and Good Earth without treating generic one-word matches as
  // families. Only prefixes actually shared by more than one distinct key
  // alter the canonical assignment.
  const prefixGroups = new Map<string, typeof candidates>();
  for (const candidate of candidates) {
    if (candidate.words.length < 2 || !candidate.key) continue;
    const prefix = compactFamilyKey(candidate.words.slice(0, 2));
    prefixGroups.set(prefix, [...(prefixGroups.get(prefix) ?? []), candidate]);
  }
  for (const group of prefixGroups.values()) {
    const allKeys = new Set(group.map((candidate) => candidate.key).filter(Boolean));
    if (allKeys.size < 2) continue;
    const label = labelFromWords(group[0].words.slice(0, 2));
    const project = { key: normalizeProjectKey(label), label };
    const inferredKeys = new Set(group.filter((candidate) => !candidate.explicit).map((candidate) => candidate.key).filter(Boolean));
    for (const key of inferredKeys) canonicalByKey.set(String(key), project);
  }

  for (const candidate of candidates) {
    const project = candidate.explicit ? { key: candidate.key, label: candidate.label } : candidate.key ? canonicalByKey.get(candidate.key) : undefined;
    assignments.set(candidate.id, project ?? { key: candidate.key, label: candidate.label });
  }

  return assignments;
}
