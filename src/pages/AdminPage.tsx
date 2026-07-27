// The importer uses browser-only File and worker APIs that Cloudflare's type set does not model.
// Runtime checks protect those boundaries; keep this page independently buildable from the public site.
// @ts-nocheck
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from "react";
import { ArrowLeft, ChevronDown, ChevronUp, Eye, EyeOff, Pause, Play, RotateCcw, Trash2, Upload, X } from "lucide-react";
import { BrowserZipReader } from "../lib/browserZipReader";
import { developmentPortfolioImages } from "../data/devPortfolio";
import { workCategories } from "../data/workCategories";
import type { DuplicateReview, ImportBatchProgress, ImportEntryProgress, ZipEntryMeta } from "../types/imports";
import type { PortfolioImage, PortfolioStatus, TestimonialRecord } from "../types/portfolio";

type AdminTab = "images" | "upload" | "duplicates" | "testimonials";
type DuplicateAction = "keep-existing-only" | "keep-new-only" | "keep-both" | "use-existing-in-category";
type UploadResponse = { outcome: "uploaded" | "duplicate"; review?: DuplicateReview };

const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const MAX_SOURCE_RECORD_BYTES = 512 * 1024;
const tabs: Array<[AdminTab, string]> = [["images", "Images"], ["upload", "Upload Images"], ["duplicates", "Duplicate Review"], ["testimonials", "Testimonials"]];

const developmentDuplicateReviews: DuplicateReview[] = [
  {
    id: "development-exact-review",
    batchId: "development-batch",
    sourceFilename: "big-rock-junk-removal-truck-rear-angle.jpg",
    sourceZip: "mtd-session-renamed-44.zip",
    kind: "exact",
    status: "pending",
    existingImage: { id: "big-rock", filename: "big-rock-junk-removal-truck-rear-angle.jpg", sourceZip: "mtd-session-renamed-44-v2.zip", imageUrl: developmentPortfolioImages[0]?.imageUrl },
    incomingImage: { filename: "big-rock-junk-removal-truck-rear-angle.jpg" },
  },
  {
    id: "development-potential-review",
    batchId: "development-batch",
    sourceFilename: "enola-area-fire-department-fire-truck-detail-v3.jpg",
    sourceZip: "mtd-session-renamed-88.zip",
    kind: "potential",
    status: "pending",
    existingImage: { id: "existing-example", filename: "enola-area-fire-department-fire-truck-detail.jpg", sourceZip: "mtd-session-renamed-44.zip", imageUrl: developmentPortfolioImages[4]?.imageUrl },
    incomingImage: { id: "incoming-example", filename: "enola-area-fire-department-fire-truck-detail-v3.jpg", sourceZip: "mtd-session-renamed-88.zip", imageUrl: developmentPortfolioImages[5]?.imageUrl },
  },
];

function shortCategory(categoryId: string) {
  return workCategories.find((category) => category.id === categoryId)?.label ?? categoryId;
}

function isZip(file: File) { return /\.zip$/i.test(file.name); }
function isImage(file: File) { return /\.(jpe?g|png|webp|avif)$/i.test(file.name); }
function formatBytes(bytes: number) { return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(bytes >= 100 * 1024 * 1024 ? 0 : 1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`; }
function displayFilename(path: string) { return path.split("/").filter(Boolean).pop() ?? path; }

function duplicateImages(review: DuplicateReview): Array<{ label: string; image: DuplicateReview["existingImage"] | DuplicateReview["incomingImage"] }> {
  return [
    { label: "Existing image", image: review.existingImage },
    { label: "Incoming image", image: review.incomingImage },
  ];
}

function queueCounts(entries: ImportEntryProgress[]) {
  const images = entries.filter((entry) => entry.kind === "image");
  return {
    uploaded: images.filter((entry) => entry.status === "uploaded").length,
    skipped: images.filter((entry) => entry.status === "skipped").length,
    failed: images.filter((entry) => entry.status === "failed").length,
    duplicates: images.filter((entry) => entry.status === "duplicate").length,
  };
}

async function browserHash(file: File) {
  const hash = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(hash)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

export default function AdminPage() {
  const [tab, setTab] = useState<AdminTab>("images");
  const [images, setImages] = useState<PortfolioImage[]>(developmentPortfolioImages);
  const [testimonials, setTestimonials] = useState<TestimonialRecord[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | PortfolioStatus>("all");
  const [remoteReady, setRemoteReady] = useState(false);
  const [zipQueue, setZipQueue] = useState<ImportBatchProgress[]>([]);
  const [duplicateReviews, setDuplicateReviews] = useState<DuplicateReview[]>(developmentDuplicateReviews);
  const [selectedCategory, setSelectedCategory] = useState("vehicle-wraps-fleet-graphics");
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notice, setNotice] = useState("");
  const queueRef = useRef<ImportBatchProgress[]>([]);
  const processingRef = useRef(false);
  const pauseAfterCurrentRef = useRef(false);
  const cancelAfterCurrentRef = useRef(new Set<string>());
  const developmentHashesRef = useRef(new Map<string, DuplicateReview["existingImage"]>());

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/portfolio").then((response) => response.ok ? response.json() : Promise.reject()),
      fetch("/api/admin/testimonials").then((response) => response.ok ? response.json() : Promise.reject()),
    ]).then(([portfolio, testimonialResponse]) => {
      setImages(portfolio.images);
      setTestimonials(testimonialResponse.testimonials);
      setRemoteReady(true);
      return fetch("/api/admin/duplicate-reviews").then((response) => response.ok ? response.json() : Promise.reject());
    }).then((response) => setDuplicateReviews(response.reviews)).catch(() => setRemoteReady(false));
  }, []);

  const filteredImages = useMemo(() => images.filter((image) => (categoryFilter === "all" || image.categoryId === categoryFilter) && (statusFilter === "all" || image.status === statusFilter)), [categoryFilter, images, statusFilter]);
  const overall = useMemo(() => {
    const imageEntries = zipQueue.flatMap((item) => item.entries).filter((entry) => entry.kind === "image");
    const complete = imageEntries.filter((entry) => ["uploaded", "duplicate", "skipped"].includes(entry.status)).length;
    return { total: imageEntries.length, complete };
  }, [zipQueue]);

  function commitQueue(next: ImportBatchProgress[]) {
    queueRef.current = next;
    setZipQueue(next);
  }

  function updateQueueItem(clientId: string, transform: (item: ImportBatchProgress) => ImportBatchProgress) {
    commitQueue(queueRef.current.map((item) => item.clientId === clientId ? transform(item) : item));
  }

  function updateEntry(clientId: string, path: string, patch: Partial<ImportEntryProgress>) {
    updateQueueItem(clientId, (item) => {
      const entries = item.entries.map((entry) => entry.path === path ? { ...entry, ...patch } : entry);
      return { ...item, entries, ...queueCounts(entries) };
    });
  }

  async function saveImage(id: string, patch: Partial<PortfolioImage>) {
    const selectedImage = images.find((image) => image.id === id);
    if (!selectedImage) return;

    // Status changes are publishing decisions. A separate eye control is kept
    // for deliberately hiding an image after it has been published.
    const savedPatch: Partial<PortfolioImage> = { ...patch };
    if (savedPatch.status) savedPatch.isHidden = false;
    if (savedPatch.isCategoryCover) {
      savedPatch.status = "featured";
      savedPatch.isHidden = false;
    }

    const applyPatch = () => setImages((current) => current.map((image) => {
      if (savedPatch.isCategoryCover && image.categoryId === (savedPatch.categoryId ?? selectedImage.categoryId) && image.id !== id) {
        return { ...image, isCategoryCover: false };
      }
      return image.id === id ? { ...image, ...savedPatch } : image;
    }));

    if (!remoteReady) {
      applyPatch();
      setNotice("Saved locally. Connect the Cloudflare database to publish this change.");
      return;
    }

    try {
      const response = await fetch(`/api/admin/portfolio?id=${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(savedPatch),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "This image could not be saved.");
      applyPatch();
      setNotice("Image saved.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "This image could not be saved.");
    }
  }

  async function removeImage(id: string) {
    if (!window.confirm("Delete this image permanently? This cannot be undone.")) return;
    setImages((current) => current.filter((image) => image.id !== id));
    if (remoteReady) await fetch(`/api/admin/portfolio?id=${encodeURIComponent(id)}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirm: true }) });
  }

  function addFiles(selected: File[]) {
    const zipFiles = selected.filter(isZip);
    const imageFiles = selected.filter(isImage);
    const rejected = selected.filter((file) => !isZip(file) && !isImage(file));
    const newItems: ImportBatchProgress[] = zipFiles.map((file) => ({ clientId: crypto.randomUUID(), sourceName: file.name, sourceSize: file.size, file, status: "queued", entries: [], uploaded: 0, skipped: 0, failed: 0, duplicates: 0 }));

    if (imageFiles.length) {
      const entries: ImportEntryProgress[] = imageFiles.map((file) => ({ path: file.name, filename: file.name, kind: "image", compressionMethod: 0, compressedSize: file.size, uncompressedSize: file.size, status: "pending" }));
      newItems.push({ clientId: crypto.randomUUID(), sourceName: `${imageFiles.length} selected image${imageFiles.length === 1 ? "" : "s"}`, sourceSize: imageFiles.reduce((sum, file) => sum + file.size, 0), individualFiles: imageFiles, status: "queued", entries, uploaded: 0, skipped: 0, failed: 0, duplicates: 0 });
    }

    if (newItems.length) {
      commitQueue([...queueRef.current, ...newItems]);
      setTab("upload");
      setNotice(`${newItems.length} import ${newItems.length === 1 ? "batch is" : "batches are"} ready. ZIP packages stay on this device; only extracted images are transferred.`);
    }
    if (rejected.length) setNotice(`${rejected.map((file) => file.name).join(", ")} could not be added because it is not an image or ZIP package.`);
  }

  async function createBatch(item: ImportBatchProgress, imageCount: number) {
    if (!remoteReady) return `local-${item.clientId}`;
    const response = await fetch("/api/admin/import-batch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sourceName: item.sourceName, sourceSize: item.sourceSize, imageCount }) });
    if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error ?? "Import batch could not be started.");
    return String((await response.json()).batchId);
  }

  async function recordBatchAction(batchId: string | undefined, action: "failed" | "skipped" | "finalize" | "cancel", filename?: string, error?: string) {
    if (!remoteReady || !batchId) return;
    await fetch("/api/admin/import-batch", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ batchId, action, filename, error }) });
  }

  async function storeSourceRecord(batchId: string | undefined, sourceZip: string, entry: ZipEntryMeta, bytes: Uint8Array) {
    if (!remoteReady || !batchId) return;
    await fetch("/api/admin/import-log", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ batchId, sourceZip, filename: entry.path, kind: "source-record", content: new TextDecoder().decode(bytes) }) });
  }

  async function uploadOne(file: File, item: ImportBatchProgress, sourceFilename: string, duplicateAction?: "keep-both" | "keep-new", reviewId?: string): Promise<UploadResponse> {
    if (!remoteReady) {
      if (import.meta.env.DEV && /simulate[-_ ]failure/i.test(file.name)) throw new Error("Development test: this extracted image was intentionally marked as failed. Retry is available.");
      const hash = await browserHash(file);
      const existing = developmentHashesRef.current.get(hash);
      if (existing && !duplicateAction) {
        return { outcome: "duplicate", review: { id: crypto.randomUUID(), batchId: item.batchId ?? item.clientId, sourceFilename, sourceZip: item.sourceName, kind: "exact", status: "pending", existingImage: existing, incomingImage: { filename: file.name, size: file.size } } };
      }
      developmentHashesRef.current.set(hash, { id: crypto.randomUUID(), filename: file.name, sourceZip: item.sourceName, size: file.size });
      return { outcome: "uploaded" };
    }
    const form = new FormData();
    form.set("image", file);
    form.set("batchId", item.batchId ?? "");
    form.set("sourceFilename", sourceFilename);
    form.set("sourceZip", item.sourceName);
    form.set("category", selectedCategory);
    if (duplicateAction) form.set("duplicateAction", duplicateAction);
    if (reviewId) form.set("reviewId", reviewId);
    const response = await fetch("/api/admin/import-image", { method: "POST", body: form });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error ?? `${file.name} could not be uploaded.`);
    return payload as UploadResponse;
  }

  async function processBatch(clientId: string, onlyPaths?: string[], forcedAction?: "keep-both" | "keep-new", reviewId?: string) {
    let item = queueRef.current.find((candidate) => candidate.clientId === clientId);
    if (!item) return;
    let reader: BrowserZipReader | undefined;

    try {
      updateQueueItem(clientId, (current) => ({ ...current, status: current.entries.length ? "processing" : "reading", message: undefined }));
      let entries = item.entries;
      if (!entries.length && item.file) {
        reader = new BrowserZipReader();
        const listed = await reader.open(item.file);
        entries = listed.filter((entry) => !entry.path.endsWith("/")).map((entry) => ({ ...entry, status: entry.kind === "unsupported" ? "skipped" : "pending" }));
        const batchId = await createBatch(item, entries.filter((entry) => entry.kind === "image").length);
        updateQueueItem(clientId, (current) => ({ ...current, batchId, entries, status: "processing", ...queueCounts(entries) }));
        item = queueRef.current.find((candidate) => candidate.clientId === clientId)!;
      } else if (!item.batchId) {
        const batchId = await createBatch(item, entries.filter((entry) => entry.kind === "image").length);
        updateQueueItem(clientId, (current) => ({ ...current, batchId, status: "processing" }));
        item = queueRef.current.find((candidate) => candidate.clientId === clientId)!;
      }

      if (item.file && !reader) {
        reader = new BrowserZipReader();
        await reader.open(item.file);
      }

      for (const entry of entries.filter((candidate) => candidate.kind === "source-record" && candidate.status === "pending")) {
        try {
          const data = await reader!.read(entry.path, Math.min(MAX_SOURCE_RECORD_BYTES, Math.max(1, entry.uncompressedSize)));
          await storeSourceRecord(item.batchId, item.sourceName, entry, data);
          updateEntry(clientId, entry.path, { status: "skipped" });
        } catch (error) {
          updateEntry(clientId, entry.path, { status: "failed", error: error instanceof Error ? error.message : "Source record could not be read." });
        }
      }

      for (const entry of entries.filter((candidate) => candidate.kind === "unsupported")) {
        if (entry.reason) await recordBatchAction(item.batchId, "skipped", entry.path, entry.reason);
      }

      const paths = onlyPaths ?? entries.filter((entry) => entry.kind === "image" && (entry.status === "pending" || entry.status === "failed")).map((entry) => entry.path);
      for (const path of paths) {
        item = queueRef.current.find((candidate) => candidate.clientId === clientId)!;
        if (cancelAfterCurrentRef.current.has(clientId)) break;
        if (pauseAfterCurrentRef.current) break;
        const entry = item.entries.find((candidate) => candidate.path === path);
        if (!entry || entry.kind !== "image") continue;
        updateEntry(clientId, path, { status: "uploading", error: undefined });
        updateQueueItem(clientId, (current) => ({ ...current, currentFilename: entry.filename }));
        try {
          let file: File;
          if (item.individualFiles) {
            const original = item.individualFiles.find((candidate) => candidate.name === entry.path);
            if (!original) throw new Error(`${entry.filename} is no longer available for retry.`);
            file = original;
          } else {
            const bytes = await reader!.read(entry.path, MAX_IMAGE_BYTES);
            file = new File([bytes.buffer as ArrayBuffer], entry.filename, { type: entry.filename.toLowerCase().endsWith(".png") ? "image/png" : entry.filename.toLowerCase().endsWith(".webp") ? "image/webp" : entry.filename.toLowerCase().endsWith(".avif") ? "image/avif" : "image/jpeg" });
          }
          if (file.size > MAX_IMAGE_BYTES) throw new Error(`${entry.filename} exceeds the 25 MB individual-image safety limit.`);
          const result = await uploadOne(file, item, entry.path, forcedAction, reviewId);
          if (result.outcome === "duplicate" && result.review) {
            setDuplicateReviews((current) => [...current.filter((review) => review.id !== result.review!.id), result.review!]);
            updateEntry(clientId, path, { status: "duplicate", reviewId: result.review.id });
          } else {
            updateEntry(clientId, path, { status: "uploaded", reviewId: undefined });
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : `${entry.filename} could not be processed.`;
          updateEntry(clientId, path, { status: "failed", error: message });
          await recordBatchAction(item.batchId, "failed", entry.path, message);
        }
      }

      item = queueRef.current.find((candidate) => candidate.clientId === clientId)!;
      const cancelled = cancelAfterCurrentRef.current.has(clientId);
      const paused = pauseAfterCurrentRef.current;
      if (cancelled) {
        cancelAfterCurrentRef.current.delete(clientId);
        updateQueueItem(clientId, (current) => ({ ...current, status: "cancelled", currentFilename: undefined }));
        await recordBatchAction(item.batchId, "cancel");
      } else if (paused) {
        pauseAfterCurrentRef.current = false;
        updateQueueItem(clientId, (current) => ({ ...current, status: "paused", currentFilename: undefined }));
      } else {
        const latest = queueRef.current.find((candidate) => candidate.clientId === clientId)!;
        const counts = queueCounts(latest.entries);
        updateQueueItem(clientId, (current) => ({ ...current, status: counts.failed || counts.duplicates ? "partially-completed" : "completed", currentFilename: undefined }));
        await recordBatchAction(item.batchId, "finalize");
      }
    } catch (error) {
      updateQueueItem(clientId, (current) => ({ ...current, status: "failed", message: error instanceof Error ? error.message : "ZIP could not be opened." }));
    } finally {
      reader?.close();
    }
  }

  async function startImport(clientId?: string, onlyPaths?: string[], action?: "keep-both" | "keep-new", reviewId?: string) {
    if (processingRef.current) return;
    processingRef.current = true;
    setIsProcessing(true);
    try {
      let current = clientId ? queueRef.current.find((item) => item.clientId === clientId) : queueRef.current.find((item) => item.status === "queued");
      while (current) {
        await processBatch(current.clientId, onlyPaths, action, reviewId);
        if (clientId || !autoAdvance) break;
        current = queueRef.current.find((item) => item.status === "queued");
      }
    } finally {
      processingRef.current = false;
      setIsProcessing(false);
    }
  }

  async function resolveDuplicate(review: DuplicateReview, action: DuplicateAction) {
    if ((action === "keep-new-only" || action === "keep-both") && review.kind === "exact") {
      const item = queueRef.current.find((candidate) => candidate.batchId === review.batchId);
      if (!item) { setNotice("To keep the incoming exact duplicate, reselect its original ZIP package. Completed entries will be skipped automatically."); return; }
      await startImport(item.clientId, [review.sourceFilename], action === "keep-new-only" ? "keep-new" : "keep-both", review.id);
      setDuplicateReviews((current) => current.filter((candidate) => candidate.id !== review.id));
      return;
    }
    if (remoteReady) {
      const response = await fetch("/api/admin/duplicate-reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reviewId: review.id, action, categoryId: selectedCategory }) });
      if (!response.ok) { setNotice((await response.json().catch(() => ({}))).error ?? "Duplicate decision could not be saved."); return; }
    }
    setDuplicateReviews((current) => current.filter((candidate) => candidate.id !== review.id));
    setNotice("Duplicate decision saved. Nothing was removed without this owner decision.");
  }

  function retryFailed(clientId: string) {
    const item = queueRef.current.find((candidate) => candidate.clientId === clientId);
    if (!item) return;
    const paths = item.entries.filter((entry) => entry.status === "failed").map((entry) => entry.path);
    void startImport(clientId, paths);
  }

  function addTestimonial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const record: TestimonialRecord = { id: crypto.randomUUID(), text: String(data.get("text") || ""), clientName: String(data.get("clientName") || ""), isActive: false, displayOrder: testimonials.length + 1 };
    setTestimonials((current) => [...current, record]);
    form.reset();
    if (remoteReady) fetch("/api/admin/testimonials", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(record) });
  }

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(event.target.files ?? []));
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    addFiles(Array.from(event.dataTransfer.files));
  }

  return (
    <main className="min-h-screen bg-ink px-5 py-8 sm:px-8 lg:py-12">
      <div className="mx-auto max-w-[1400px]">
        <div className="flex flex-wrap items-center justify-between gap-5 border-b border-line pb-6"><a href="/" className="inline-flex items-center gap-2 font-body text-sm font-bold uppercase tracking-wide text-bone transition-colors hover:text-orange"><ArrowLeft size={16} aria-hidden="true" /> Return Home</a><span className="text-xs font-bold uppercase tracking-[0.18em] text-orange">Private MTD portfolio manager</span></div>
        {!remoteReady && <p className="mt-6 border border-orange/40 bg-charcoal2 px-4 py-3 text-sm text-bone/70">Local development preview. ZIPs are still opened in this browser, but image transfers are simulated until Cloudflare Access, R2, and D1 are connected.</p>}
        <header className="mt-12"><h1 className="font-display text-5xl font-semibold uppercase leading-[0.9] text-bone sm:text-7xl">Portfolio Admin</h1></header>
        <nav className="mt-10 flex flex-wrap gap-x-6 gap-y-3 border-b border-line pb-4" aria-label="Admin sections">{tabs.map(([id, label]) => <button type="button" key={id} onClick={() => setTab(id)} className={`text-sm font-bold uppercase tracking-wide ${tab === id ? "text-orange" : "text-bone/60 hover:text-bone"}`}>{label}</button>)}</nav>
        {notice && <p className="mt-5 border border-line bg-charcoal2 px-4 py-3 text-sm text-bone/75">{notice}</p>}

        {tab === "images" && <section className="mt-8"><div className="flex flex-wrap gap-4"><label className="text-sm text-bone/70">Category<select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="ml-2 bg-charcoal2 px-3 py-2 text-bone"><option value="all">All</option>{workCategories.map((category) => <option value={category.id} key={category.id}>{category.label}</option>)}</select></label><label className="text-sm text-bone/70">Status<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | PortfolioStatus)} className="ml-2 bg-charcoal2 px-3 py-2 text-bone"><option value="all">All</option><option value="featured">Featured</option><option value="archive">Archive</option></select></label></div><div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{filteredImages.map((image) => <article className="border border-line bg-charcoal2" key={image.id}><img src={image.imageUrl} alt={image.altText} className="aspect-[4/3] w-full object-cover" /><div className="space-y-3 p-4"><p className="text-xs font-bold uppercase tracking-[0.12em] text-orange">{shortCategory(image.categoryId)} Â· {image.status}</p><p className="truncate text-sm text-bone/70">{image.filename}</p><label className="block text-xs text-bone/60">Change Category<select value={image.categoryId} onChange={(event: ChangeEvent<HTMLSelectElement>) => saveImage(image.id, { categoryId: event.target.value })} className="ml-2 bg-ink px-2 py-1 text-bone">{workCategories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}</select></label><label className="block text-xs text-bone/60">Project<input defaultValue={image.projectLabel ?? ""} onBlur={(event) => { if (event.currentTarget.value !== (image.projectLabel ?? "")) saveImage(image.id, { projectLabel: event.currentTarget.value }); }} placeholder="Automatic from filename" className="mt-1 block w-full bg-ink px-2 py-1 text-sm text-bone" /></label><div className="flex flex-wrap gap-2"><button type="button" onClick={() => saveImage(image.id, { status: image.status === "featured" ? "archive" : "featured" })} className="border border-line px-2 py-1 text-xs font-bold text-bone hover:border-orange">{image.status === "featured" ? "Demote to Archive" : "Promote to Featured"}</button><button type="button" onClick={() => saveImage(image.id, { isCategoryCover: true, status: "featured" })} className="border border-line px-2 py-1 text-xs font-bold text-bone hover:border-orange">Make Category Cover</button><button type="button" onClick={() => saveImage(image.id, { rank: Math.max(1, image.rank - 1) })} aria-label="Move Earlier" className="border border-line p-1 text-bone hover:border-orange"><ChevronUp size={15} /></button><button type="button" onClick={() => saveImage(image.id, { rank: image.rank + 1 })} aria-label="Move Later" className="border border-line p-1 text-bone hover:border-orange"><ChevronDown size={15} /></button><button type="button" onClick={() => saveImage(image.id, { isHidden: !image.isHidden })} className="border border-line p-1 text-bone hover:border-orange" aria-label={image.isHidden ? "Make visible" : "Hide"}>{image.isHidden ? <Eye size={15} /> : <EyeOff size={15} />}</button><button type="button" onClick={() => removeImage(image.id)} className="border border-line p-1 text-bone hover:border-orange" aria-label="Delete"><Trash2 size={15} /></button></div></div></article>)}</div></section>}

        {tab === "upload" && <section className="mt-8 max-w-4xl"><h2 className="font-display text-3xl font-semibold uppercase text-bone">Browser ZIP Import</h2><p className="mt-3 max-w-2xl text-bone/65">Choose original Claude ZIP packages exactly as they are. Each ZIP is opened locally in this browser. Images are extracted and sent one at a time; ZIPs, CSV logs, Markdown reports, and notes are never placed in the public site.</p><label onDragOver={(event) => event.preventDefault()} onDrop={handleDrop} className="mt-7 block cursor-pointer border border-dashed border-line bg-charcoal2 p-6 text-center transition-colors hover:border-orange"><Upload className="mx-auto text-orange" size={22} aria-hidden="true" /><span className="mt-3 block font-body text-sm font-bold uppercase tracking-wide text-bone">Choose ZIP Files or Images</span><span className="mt-2 block text-sm text-bone/55">Original ZIPs up to at least 250 MB are accepted. Large packages run one at a time.</span><input onChange={handleFileInput} type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif,.zip" className="sr-only" /></label><div className="mt-5 flex flex-wrap items-center gap-5"><label className="text-sm text-bone/70">Fallback category<select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)} className="ml-2 bg-charcoal2 px-3 py-2 text-bone">{workCategories.map((category) => <option value={category.id} key={category.id}>{category.label}</option>)}</select></label><label className="inline-flex items-center gap-2 text-sm text-bone/70"><input checked={autoAdvance} onChange={(event) => setAutoAdvance(event.target.checked)} type="checkbox" /> Continue automatically to the next ZIP</label></div>{overall.total > 0 && <p className="mt-6 text-sm text-bone/70">Overall progress: <span className="font-bold text-bone">{overall.complete} of {overall.total} images complete</span></p>}<div className="mt-7 space-y-4">{zipQueue.length === 0 ? <p className="border border-line p-5 text-sm text-bone/60">No files are queued yet. You can add a few ZIPs now and continue with more in another session.</p> : zipQueue.map((item) => { const total = item.entries.filter((entry) => entry.kind === "image").length; const complete = item.uploaded + item.skipped + item.duplicates; return <article key={item.clientId} className="border border-line bg-charcoal2 p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="font-body text-sm font-bold text-bone">{item.sourceName}</p><p className="mt-1 text-xs text-bone/55">{formatBytes(item.sourceSize)} Â· {item.status.replace("-", " ")}</p></div><div className="flex flex-wrap gap-2">{["queued", "paused", "failed"].includes(item.status) && <button type="button" onClick={() => void startImport(item.clientId)} disabled={isProcessing} className="inline-flex min-h-11 items-center gap-2 border border-line px-3 text-xs font-bold uppercase text-bone hover:border-orange disabled:opacity-50"><Play size={14} /> {item.status === "paused" ? "Resume" : "Import"}</button>}{item.status === "processing" && <button type="button" onClick={() => { pauseAfterCurrentRef.current = true; setNotice("This ZIP will pause after the image currently uploading finishes."); }} className="inline-flex min-h-11 items-center gap-2 border border-line px-3 text-xs font-bold uppercase text-bone hover:border-orange"><Pause size={14} /> Pause after current</button>}{item.failed > 0 && <button type="button" onClick={() => retryFailed(item.clientId)} disabled={isProcessing} className="inline-flex min-h-11 items-center gap-2 border border-line px-3 text-xs font-bold uppercase text-bone hover:border-orange disabled:opacity-50"><RotateCcw size={14} /> Retry failed</button>}{["queued", "reading", "processing", "paused"].includes(item.status) && <button type="button" onClick={() => { cancelAfterCurrentRef.current.add(item.clientId); if (item.status !== "processing") updateQueueItem(item.clientId, (current) => ({ ...current, status: "cancelled" })); }} className="inline-flex min-h-11 items-center gap-2 border border-line px-3 text-xs font-bold uppercase text-bone hover:border-orange"><X size={14} /> Cancel</button>}</div></div><p className="mt-4 text-sm text-bone/75">{total ? `${item.sourceName} â€” ${complete} of ${total} images uploaded or reviewed` : item.status === "reading" ? "Reading the local ZIP directoryâ€¦" : "Ready to read the ZIP directory."}</p>{item.currentFilename && <p className="mt-2 text-xs font-bold uppercase tracking-wide text-orange">Current image: {displayFilename(item.currentFilename)}</p>}{item.sourceSize >= 200 * 1024 * 1024 && <p className="mt-3 text-sm text-orange">Large ZIP: it will be processed locally one image at a time.</p>}{item.message && <p className="mt-3 text-sm text-orange">{item.message}</p>}{item.entries.some((entry) => entry.status === "failed" || entry.kind === "unsupported") && <ul className="mt-4 space-y-1 border-t border-line pt-3 text-xs text-bone/60">{item.entries.filter((entry) => entry.status === "failed" || entry.kind === "unsupported").map((entry) => <li key={entry.path}><span className="font-bold text-orange">{entry.status === "failed" ? "Needs retry:" : "Skipped:"}</span> {entry.path}{entry.error || entry.reason ? ` â€” ${entry.error ?? entry.reason}` : ""}</li>)}</ul>}</article>; })}</div></section>}

        {tab === "duplicates" && <section className="mt-8 max-w-4xl"><h2 className="font-display text-3xl font-semibold uppercase text-bone">Duplicate Review</h2><p className="mt-3 text-bone/65">Nothing is automatically deleted. Exact matches are compared by file hash. Potential matches are staged as hidden Archive images so the owner can compare both versions before deciding.</p>{duplicateReviews.length === 0 ? <p className="mt-6 border border-line p-5 text-sm text-bone/60">No duplicate decisions are waiting.</p> : <div className="mt-6 space-y-5">{duplicateReviews.map((review) => <article key={review.id} className="border border-line bg-charcoal2 p-5"><p className="text-xs font-bold uppercase tracking-[0.16em] text-orange">{review.kind === "exact" ? "Exact duplicate" : "Potential duplicate"}</p><p className="mt-2 text-sm text-bone">{displayFilename(review.sourceFilename)} <span className="text-bone/55">from {review.sourceZip}</span></p><div className="mt-5 grid gap-4 sm:grid-cols-2">{[["Existing image", review.existingImage], ["Incoming image", review.incomingImage]].map(([label, image]) => <div className="border border-line p-3" key={String(label)}><p className="text-xs font-bold uppercase tracking-wide text-bone/60">{label}</p>{typeof image === "object" && image && "imageUrl" in image && image.imageUrl ? <img src={String(image.imageUrl)} alt={`${label} preview`} className="mt-3 aspect-[4/3] w-full object-cover" /> : <div className="mt-3 flex aspect-[4/3] items-center justify-center bg-ink px-3 text-center text-xs text-bone/45">Preview stays local until an owner decision requires the individual image.</div>}<p className="mt-3 break-words text-sm text-bone/75">{typeof image === "object" && image && "filename" in image ? image.filename : "No incoming file stored"}</p>{typeof image === "object" && image && "sourceZip" in image && image.sourceZip && <p className="mt-1 text-xs text-bone/50">{String(image.sourceZip)}</p>}</div>)}</div><div className="mt-5 flex flex-wrap gap-2"><button type="button" onClick={() => void resolveDuplicate(review, "keep-existing-only")} className="min-h-11 border border-line px-3 text-xs font-bold uppercase text-bone hover:border-orange">Keep existing only</button><button type="button" onClick={() => void resolveDuplicate(review, "keep-new-only")} className="min-h-11 border border-line px-3 text-xs font-bold uppercase text-bone hover:border-orange">Keep new only</button><button type="button" onClick={() => void resolveDuplicate(review, "keep-both")} className="min-h-11 border border-line px-3 text-xs font-bold uppercase text-bone hover:border-orange">Keep both</button><button type="button" onClick={() => void resolveDuplicate(review, "use-existing-in-category")} className="min-h-11 border border-line px-3 text-xs font-bold uppercase text-bone hover:border-orange">Use existing in selected category</button></div></article>)}</div>}</section>}

        {tab === "testimonials" && <section className="mt-8 max-w-3xl"><h2 className="font-display text-3xl font-semibold uppercase text-bone">Testimonials</h2><p className="mt-3 text-bone/65">Only active testimonials appear in the single carousel above The MTD Difference.</p><form onSubmit={addTestimonial} className="mt-6 grid gap-3"><input name="clientName" required placeholder="Client name" className="border border-line bg-transparent px-3 py-3 text-bone" /><textarea name="text" required rows={4} placeholder="Testimonial text" className="border border-line bg-transparent px-3 py-3 text-bone" /><button type="submit" className="w-fit bg-orange px-5 py-3 text-sm font-bold uppercase text-ink">Add Testimonial</button></form><div className="mt-7 space-y-3">{testimonials.map((testimonial) => <article key={testimonial.id} className="border border-line bg-charcoal2 p-4"><p className="text-bone">{testimonial.text}</p><p className="mt-2 text-sm text-bone/55">{testimonial.clientName} Â· {testimonial.isActive ? "Active" : "Inactive"}</p></article>)}</div></section>}
      </div>
    </main>
  );
}

