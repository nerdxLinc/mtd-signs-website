export type ZipEntryKind = "image" | "source-record" | "unsupported";

export type ZipEntryMeta = {
  path: string;
  filename: string;
  kind: ZipEntryKind;
  compressionMethod: number;
  compressedSize: number;
  uncompressedSize: number;
  reason?: string;
};

export type ImportEntryStatus = "pending" | "uploading" | "uploaded" | "duplicate" | "skipped" | "failed";

export type ImportEntryProgress = ZipEntryMeta & {
  status: ImportEntryStatus;
  error?: string;
  reviewId?: string;
};

export type ImportBatchStatus = "queued" | "reading" | "processing" | "paused" | "completed" | "partially-completed" | "failed" | "cancelled";

export type ImportBatchProgress = {
  clientId: string;
  batchId?: string;
  sourceName: string;
  sourceSize: number;
  file?: File;
  individualFiles?: File[];
  status: ImportBatchStatus;
  entries: ImportEntryProgress[];
  currentFilename?: string;
  uploaded: number;
  skipped: number;
  failed: number;
  duplicates: number;
  message?: string;
};

export type DuplicateKind = "exact" | "potential";

export type DuplicateReview = {
  id: string;
  batchId: string;
  sourceFilename: string;
  sourceZip: string;
  kind: DuplicateKind;
  status: "pending" | "resolved";
  existingImage?: {
    id: string;
    filename: string;
    sourceZip?: string;
    width?: number | null;
    height?: number | null;
    size?: number | null;
    imageUrl?: string;
  };
  incomingImage?: {
    id?: string;
    filename: string;
    sourceZip?: string;
    width?: number | null;
    height?: number | null;
    size?: number | null;
    imageUrl?: string;
  };
};
