/// <reference lib="webworker" />

type ZipEntryMeta = {
  path: string;
  filename: string;
  kind: "image" | "source-record" | "unsupported";
  compressionMethod: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
  reason?: string;
};

type OpenMessage = { type: "open"; requestId: string; file: File };
type ReadMessage = { type: "read"; requestId: string; path: string; maximumBytes: number };
type WorkerMessage = OpenMessage | ReadMessage;

const signatures = { end: 0x06054b50, central: 0x02014b50, local: 0x04034b50 };
const decoder = new TextDecoder("utf-8");
let activeFile: File | undefined;
let entries = new Map<string, ZipEntryMeta>();

function uint16(view: DataView, offset: number) { return view.getUint16(offset, true); }
function uint32(view: DataView, offset: number) { return view.getUint32(offset, true); }
function filename(path: string) { return path.split("/").filter(Boolean).pop() ?? path; }

function classify(path: string, compressionMethod: number): Pick<ZipEntryMeta, "kind" | "reason"> {
  if (path.endsWith("/")) return { kind: "unsupported", reason: "Folder entry" };
  if (compressionMethod !== 0 && compressionMethod !== 8) return { kind: "unsupported", reason: `Unsupported ZIP compression method ${compressionMethod}` };
  if (/\.(jpe?g|png|webp|avif)$/i.test(path)) return { kind: "image" };
  if (/\.(csv|md|txt)$/i.test(path)) return { kind: "source-record" };
  return { kind: "unsupported", reason: "Not an image, CSV, Markdown, or text note" };
}

async function listEntries(file: File) {
  const tailLength = Math.min(file.size, 65_557);
  const tailStart = file.size - tailLength;
  const tail = new Uint8Array(await file.slice(tailStart).arrayBuffer());
  const tailView = new DataView(tail.buffer, tail.byteOffset, tail.byteLength);
  let endOffset = -1;

  for (let offset = tail.length - 4; offset >= 0; offset -= 1) {
    if (uint32(tailView, offset) === signatures.end) { endOffset = offset; break; }
  }
  if (endOffset < 0) throw new Error("ZIP end record could not be found.");

  const entryCount = uint16(tailView, endOffset + 10);
  const centralSize = uint32(tailView, endOffset + 12);
  const centralOffset = uint32(tailView, endOffset + 16);
  if (entryCount === 0xffff || centralOffset === 0xffffffff) throw new Error("ZIP64 archives are not supported by this importer yet.");
  if (entryCount > 10_000) throw new Error("ZIP contains more than 10,000 entries.");
  if (centralOffset + centralSize > file.size) throw new Error("ZIP central directory is outside the selected file.");

  const central = new Uint8Array(await file.slice(centralOffset, centralOffset + centralSize).arrayBuffer());
  const view = new DataView(central.buffer, central.byteOffset, central.byteLength);
  const found: ZipEntryMeta[] = [];
  let cursor = 0;

  for (let index = 0; index < entryCount; index += 1) {
    if (cursor + 46 > central.length || uint32(view, cursor) !== signatures.central) throw new Error("ZIP central directory is invalid.");
    const compressionMethod = uint16(view, cursor + 10);
    const compressedSize = uint32(view, cursor + 20);
    const uncompressedSize = uint32(view, cursor + 24);
    const nameLength = uint16(view, cursor + 28);
    const extraLength = uint16(view, cursor + 30);
    const commentLength = uint16(view, cursor + 32);
    const localHeaderOffset = uint32(view, cursor + 42);
    const path = decoder.decode(central.slice(cursor + 46, cursor + 46 + nameLength));
    const details = classify(path, compressionMethod);

    found.push({ path, filename: filename(path), compressionMethod, compressedSize, uncompressedSize, localHeaderOffset, ...details });
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  entries = new Map(found.map((entry) => [entry.path, entry]));
  return found;
}

async function readEntry(path: string, maximumBytes: number) {
  if (!activeFile) throw new Error("Choose a ZIP before reading its entries.");
  const entry = entries.get(path);
  if (!entry) throw new Error(`${path} was not found in the selected ZIP.`);
  if (entry.uncompressedSize > maximumBytes) throw new Error(`${path} exceeds the individual ${Math.round(maximumBytes / 1024 / 1024)} MB safety limit.`);
  if (entry.compressionMethod !== 0 && entry.compressionMethod !== 8) throw new Error(`${path} uses an unsupported ZIP compression method.`);

  const localHeader = new Uint8Array(await activeFile.slice(entry.localHeaderOffset, entry.localHeaderOffset + 30).arrayBuffer());
  const view = new DataView(localHeader.buffer, localHeader.byteOffset, localHeader.byteLength);
  if (uint32(view, 0) !== signatures.local) throw new Error(`${path} has an invalid local ZIP entry.`);
  const nameLength = uint16(view, 26);
  const extraLength = uint16(view, 28);
  const dataStart = entry.localHeaderOffset + 30 + nameLength + extraLength;
  const compressed = new Uint8Array(await activeFile.slice(dataStart, dataStart + entry.compressedSize).arrayBuffer());
  const data = entry.compressionMethod === 0
    ? compressed
    : new Uint8Array(await new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer());

  if (data.byteLength !== entry.uncompressedSize) throw new Error(`${path} could not be read completely from the ZIP.`);
  return data;
}

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;
  try {
    if (message.type === "open") {
      activeFile = message.file;
      const listed = await listEntries(message.file);
      self.postMessage({ type: "opened", requestId: message.requestId, entries: listed.map(({ localHeaderOffset: _offset, ...entry }) => entry) });
      return;
    }
    const data = await readEntry(message.path, message.maximumBytes);
    self.postMessage({ type: "entry", requestId: message.requestId, path: message.path, data: data.buffer }, [data.buffer]);
  } catch (error) {
    self.postMessage({ type: "error", requestId: message.requestId, message: error instanceof Error ? error.message : "ZIP entry could not be read." });
  }
};
