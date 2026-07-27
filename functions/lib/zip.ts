export type ZipEntry = { name: string; data: Uint8Array };

const decoder = new TextDecoder();
const signature = { end: 0x06054b50, central: 0x02014b50, local: 0x04034b50 };

function uint16(view: DataView, offset: number) { return view.getUint16(offset, true); }
function uint32(view: DataView, offset: number) { return view.getUint32(offset, true); }

async function inflateRaw(data: Uint8Array) {
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

// Small dependency-free ZIP reader for normal stored and DEFLATE archive entries.
// It limits size and entry count so malformed uploads fail visibly instead of silently.
export async function readZip(bytes: Uint8Array): Promise<ZipEntry[]> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let offset = Math.max(0, bytes.length - 65_557); offset <= bytes.length - 4; offset += 1) if (uint32(view, offset) === signature.end) end = offset;
  if (end < 0) throw new Error("ZIP end record could not be found.");
  const count = uint16(view, end + 10);
  const centralOffset = uint32(view, end + 16);
  if (count > 1000) throw new Error("ZIP contains more than 1,000 entries.");
  const entries: ZipEntry[] = [];
  let cursor = centralOffset;
  for (let index = 0; index < count; index += 1) {
    if (uint32(view, cursor) !== signature.central) throw new Error("ZIP central directory is invalid.");
    const method = uint16(view, cursor + 10);
    const compressedSize = uint32(view, cursor + 20);
    const uncompressedSize = uint32(view, cursor + 24);
    const nameLength = uint16(view, cursor + 28);
    const extraLength = uint16(view, cursor + 30);
    const commentLength = uint16(view, cursor + 32);
    const localOffset = uint32(view, cursor + 42);
    const name = decoder.decode(bytes.slice(cursor + 46, cursor + 46 + nameLength));
    if (uncompressedSize > 25 * 1024 * 1024) throw new Error(`${name} is too large to import.`);
    if (uint32(view, localOffset) !== signature.local) throw new Error(`${name} has an invalid local entry.`);
    const localNameLength = uint16(view, localOffset + 26);
    const localExtraLength = uint16(view, localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.slice(dataStart, dataStart + compressedSize);
    const data = method === 0 ? compressed : method === 8 ? await inflateRaw(compressed) : (() => { throw new Error(`${name} uses an unsupported ZIP compression method.`); })();
    entries.push({ name, data });
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}
