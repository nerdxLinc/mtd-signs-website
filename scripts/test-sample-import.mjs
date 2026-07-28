import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { createHash } from "node:crypto";
import { inflateRawSync } from "node:zlib";

const decoder = new TextDecoder();
const signature = { end: 0x06054b50, central: 0x02014b50, local: 0x04034b50 };
const isImage = (name) => /\.(jpe?g|png|webp|avif)$/i.test(name);
const get16 = (view, offset) => view.getUint16(offset, true);
const get32 = (view, offset) => view.getUint32(offset, true);

function readZip(path) {
  const bytes = readFileSync(path);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let offset = Math.max(0, bytes.length - 65557); offset <= bytes.length - 4; offset += 1) if (get32(view, offset) === signature.end) end = offset;
  if (end < 0) throw new Error(`${path}: ZIP end record missing`);
  const count = get16(view, end + 10);
  let cursor = get32(view, end + 16);
  const entries = [];
  for (let index = 0; index < count; index += 1) {
    if (get32(view, cursor) !== signature.central) throw new Error(`${path}: invalid central entry`);
    const method = get16(view, cursor + 10);
    const size = get32(view, cursor + 20);
    const nameLength = get16(view, cursor + 28);
    const extraLength = get16(view, cursor + 30);
    const commentLength = get16(view, cursor + 32);
    const localOffset = get32(view, cursor + 42);
    const name = decoder.decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength));
    const localNameLength = get16(view, localOffset + 26);
    const localExtraLength = get16(view, localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.subarray(dataStart, dataStart + size);
    const data = method === 0 ? compressed : method === 8 ? inflateRawSync(compressed) : null;
    entries.push({ name, data, method });
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function imageType(bytes) {
  if (bytes?.[0] === 0xff && bytes?.[1] === 0xd8) return "jpeg";
  if (decoder.decode(bytes?.subarray(1, 4)) === "PNG") return "png";
  if (decoder.decode(bytes?.subarray(8, 12)) === "WEBP") return "webp";
  if (decoder.decode(bytes?.subarray(4, 8)) === "ftyp") return "avif";
  return null;
}

function category(name) {
  const text = name.toLowerCase();
  if (/(fire|police|sheriff|ems|rescue|public-safety)/.test(text)) return "Public Safety";
  if (/(church|ministry|worship|baptist|fellowship|assembly|disciples|chapel|parish|congregation)/.test(text)) return "Church & Ministry";
  if (/(logo|identity|brand-mark|brandmark|wordmark|letterhead|business-card)/.test(text)) return "Logo & Identity";
  if (/(truck|van|trailer|vehicle|fleet|wrap|passenger-side|driver-side|rear-angle)/.test(text)) return "Vehicle Wraps";
  if (/(sign|signage|pylon|monument|window|wall|display|wayfinding|storefront|awning|cabinet)/.test(text)) return "Commercial Branding";
  return "Specialty Projects";
}

const sources = process.argv.slice(2);
if (!sources.length) throw new Error("Pass one or more ZIP paths.");
const hashes = new Map();
const potentialKeys = new Map();
const archiveResults = [];
const unreadable = [];

for (const source of sources) {
  const entries = readZip(source);
  const images = entries.filter((entry) => isImage(entry.name) && !entry.name.endsWith("/"));
  const nonImages = entries.filter((entry) => !isImage(entry.name) && !entry.name.endsWith("/"));
  for (const entry of images) {
    const type = imageType(entry.data);
    if (!type) { unreadable.push(`${basename(source)}: ${entry.name}`); continue; }
    const record = { archive: basename(source), filename: entry.name, category: category(entry.name), hash: createHash("sha256").update(entry.data).digest("hex") };
    hashes.set(record.hash, [...(hashes.get(record.hash) ?? []), record]);
    const stem = entry.name.toLowerCase().replace(/\.[^.]+$/, "").replace(/[^a-z0-9]+/g, " ").split(" ").filter((word) => word.length > 2 && !["side", "angle", "copy"].includes(word)).sort().join("|");
    potentialKeys.set(stem, [...(potentialKeys.get(stem) ?? []), record]);
  }
  archiveResults.push({ archive: basename(source), images: images.length, privateNonImageFiles: nonImages.map((entry) => entry.name) });
}

const exact = [...hashes.values()].filter((group) => group.length > 1);
const potential = [...potentialKeys.values()].filter((group) => group.length > 1 && new Set(group.map((entry) => entry.hash)).size > 1);
console.log(JSON.stringify({ archives: archiveResults, unreadable, exactDuplicateGroups: exact.length, exactDuplicateExamples: exact.slice(0, 10), potentialDuplicateGroups: potential.length, potentialDuplicateExamples: potential.slice(0, 10) }, null, 2));

