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
  const familyWords = rows.map((row) => familyWordsFromFilename(String(row.source_filename ?? "")));
  const parents = rows.map((_, index) => index);
  const find = (index: number): number => {
    if (parents[index] !== index) parents[index] = find(parents[index]);
    return parents[index];
  };
  const join = (first: number, second: number) => {
    const firstParent = find(first); const secondParent = find(second);
    if (firstParent !== secondParent) parents[secondParent] = firstParent;
  };

  for (let first = 0; first < rows.length; first += 1) {
    for (let second = first + 1; second < rows.length; second += 1) {
      // A two-word shared prefix is deliberate: it handles meaningful client
      // names such as Taco Local and Good Earth without grouping generic
      // single words such as "sign" or "truck".
      if (commonPrefixLength(familyWords[first], familyWords[second]) >= 2) {
        join(first, second);
        continue;
      }

      // Some client names arrive without separators (TacoLocal) while other
      // images use spaces, hyphens, or an added deliverable word
      // (Taco Local Design). Treat a complete compact client name contained
      // in the other filename as the same family. This follows the owner's
      // rule that the same principal name should group together regardless
      // of punctuation; a deliberate project-label edit remains available
      // in Admin to correct a rare false positive.
      const firstKey = compactFamilyKey(familyWords[first]);
      const secondKey = compactFamilyKey(familyWords[second]);
      const sharedPrincipalName = firstKey.length >= 4 && secondKey.length >= 4
        && (firstKey.includes(secondKey) || secondKey.includes(firstKey));
      if (sharedPrincipalName) join(first, second);
    }
  }

  const groups = new Map<number, number[]>();
  rows.forEach((_, index) => {
    const root = find(index);
    groups.set(root, [...(groups.get(root) ?? []), index]);
  });

  for (const indexes of groups.values()) {
    let common = familyWords[indexes[0]] ?? [];
    for (const index of indexes.slice(1)) common = common.slice(0, commonPrefixLength(common, familyWords[index]));
    const storedFamilies = indexes
      .map((index) => {
        const key = rows[index].project_key ? String(rows[index].project_key) : undefined;
        const label = rows[index].project_label ? String(rows[index].project_label) : undefined;
        // Ignore the earlier "renamed/client" path value; projectFromRow
        // already knows when it is legacy import metadata rather than a
        // deliberate owner-provided project name.
        const resolved = projectFromRow(rows[index]);
        return key && label && resolved.key === key ? { key, label } : undefined;
      })
      .filter((project): project is { key: string; label: string } => Boolean(project));
    const allUseOneStoredFamily = storedFamilies.length === indexes.length && new Set(storedFamilies.map((project) => project.key)).size === 1;
    const containedPrincipal = indexes
      .map((index) => ({ key: compactFamilyKey(familyWords[index]), label: labelFromWords(familyWords[index]) }))
      .filter((candidate) => candidate.key.length >= 4)
      .sort((first, second) => first.key.length - second.key.length)
      .find((candidate) => indexes.every((index) => compactFamilyKey(familyWords[index]).includes(candidate.key)));
    const derivedLabel = common.length >= 2
      ? labelFromWords(common)
      : containedPrincipal?.label;
    const derivedKey = derivedLabel ? normalizeProjectKey(derivedLabel) : undefined;
    const project: ProjectFamily = allUseOneStoredFamily
      ? storedFamilies[0]
      : { key: derivedKey ?? projectFromRow(rows[indexes[0]]).key, label: derivedLabel ?? projectFromRow(rows[indexes[0]]).label };
    for (const index of indexes) assignments.set(String(rows[index].id), project);
  }

  return assignments;
}
