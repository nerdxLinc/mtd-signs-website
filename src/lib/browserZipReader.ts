import type { ZipEntryMeta } from "../types/imports";

type WorkerReply =
  | { type: "opened"; requestId: string; entries: ZipEntryMeta[] }
  | { type: "entry"; requestId: string; path: string; data: ArrayBuffer }
  | { type: "error"; requestId: string; message: string };

export class BrowserZipReader {
  private readonly worker = new Worker(new URL("../workers/zipImport.worker.ts", import.meta.url), { type: "module" });
  private readonly pending = new Map<string, { resolve: (value: unknown) => void; reject: (reason: Error) => void }>();

  constructor() {
    this.worker.addEventListener("message", (event: MessageEvent<WorkerReply>) => {
      const reply = event.data;
      const request = this.pending.get(reply.requestId);
      if (!request) return;
      this.pending.delete(reply.requestId);
      if (reply.type === "error") request.reject(new Error(reply.message));
      else if (reply.type === "opened") request.resolve(reply.entries);
      else request.resolve(new Uint8Array(reply.data));
    });
  }

  open(file: File) {
    return this.request<ZipEntryMeta[]>({ type: "open", file });
  }

  read(path: string, maximumBytes: number) {
    return this.request<Uint8Array>({ type: "read", path, maximumBytes });
  }

  close() {
    this.worker.terminate();
    this.pending.forEach((request) => request.reject(new Error("ZIP processing was stopped.")));
    this.pending.clear();
  }

  private request<T>(payload: Record<string, unknown>) {
    const requestId = crypto.randomUUID();
    return new Promise<T>((resolve, reject) => {
      this.pending.set(requestId, { resolve: (value) => resolve(value as T), reject });
      this.worker.postMessage({ ...payload, requestId });
    });
  }
}
