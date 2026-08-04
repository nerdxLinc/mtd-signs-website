// The importer uses browser-only File and worker APIs that Cloudflare's type set does not model.
// Runtime checks protect those boundaries; keep this page independently buildable from the public site.
// @ts-nocheck
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from "react";
import { ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Eye, EyeOff, Pause, Play, RotateCcw, Trash2, Upload, X } from "lucide-react";
import { BrowserZipReader } from "../lib/browserZipReader";
import { developmentPortfolioImages } from "../data/devPortfolio";
import { workCategories } from "../data/workCategories";
import type { DuplicateReview, ImportBatchProgress, ImportEntryProgress, ZipEntryMeta } from "../types/imports";
import type { PortfolioImage, PortfolioStatus, TestimonialRecord } from "../types/portfolio";

type AdminTab = "inquiries" | "images" | "review" | "upload" | "duplicates" | "testimonials";
type DuplicateAction = "keep-existing-only" | "keep-new-only" | "keep-both" | "use-existing-in-category";
type UploadResponse = { outcome: "uploaded" | "duplicate" | "skipped"; review?: DuplicateReview; reason?: string };
type ImageMoveDirection = "left" | "right" | "up" | "down";
type ContactInquiry = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  project_details: string | null;
  language: "en" | "es";
  status: "new" | "read" | "archived";
  notification_sent: number | boolean;
  notification_error: string | null;
  created_at: string;
};

const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const MAX_SOURCE_RECORD_BYTES = 512 * 1024;
const MAX_BULK_IMAGES = 100;
const tabs: Array<[AdminTab, string]> = [["inquiries", "Inquiries"], ["images", "Images"], ["review", "Review Archive"], ["upload", "Upload Images"], ["duplicates", "Duplicate Review"], ["testimonials", "Testimonials"]];

const developmentDuplicateReviews: DuplicateReview[] = [
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
function displayFilename(path: string) { return path.split(/[\\/]/).filter(Boolean).pop() ?? path; }

function filenameExtension(filename: string) {
  const match = displayFilename(filename).match(/\.(jpe?g|png|webp|avif)$/i);
  return match ? `.${match[1].toLowerCase()}` : ".jpg";
}

function filenameSlug(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function numberedFilename(projectLabel: string, index: number, count: number, currentFilename: string) {
  const width = Math.max(2, String(count).length);
  return `${filenameSlug(projectLabel)}-${String(index + 1).padStart(width, "0")}${filenameExtension(currentFilename)}`;
}

function adminGridColumns() {
  if (window.matchMedia("(min-width: 1024px)").matches) return 3;
  if (window.matchMedia("(min-width: 640px)").matches) return 2;
  return 1;
}

function reorderPortfolioImages(current: PortfolioImage[], id: string, direction: ImageMoveDirection, columns: number) {
  const selected = current.find((image) => image.id === id);
  if (!selected) return { images: current, moved: false };

  const siblingSlots: number[] = [];
  const siblings: PortfolioImage[] = [];
  current.forEach((image, index) => {
    if (image.categoryId === selected.categoryId && image.status === selected.status) {
      siblingSlots.push(index);
      siblings.push(image);
    }
  });

  const fromIndex = siblings.findIndex((image) => image.id === id);
  const distance = direction === "up" || direction === "down" ? columns : 1;
  const offset = direction === "left" || direction === "up" ? -distance : distance;
  const toIndex = Math.max(0, Math.min(siblings.length - 1, fromIndex + offset));
  if (fromIndex < 0 || fromIndex === toIndex) return { images: current, moved: false };

  const reordered = [...siblings];
  const [movedImage] = reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, movedImage);

  const next = [...current];
  siblingSlots.forEach((slot, index) => {
    next[slot] = { ...reordered[index], rank: (index + 1) * 10 };
  });
  return { images: next, moved: true };
}

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
  const [inquiries, setInquiries] = useState<ContactInquiry[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | PortfolioStatus>("all");
  const [remoteReady, setRemoteReady] = useState(false);
  const [zipQueue, setZipQueue] = useState<ImportBatchProgress[]>([]);
  const [duplicateReviews, setDuplicateReviews] = useState<DuplicateReview[]>(developmentDuplicateReviews);
  const [selectedCategory, setSelectedCategory] = useState("specialty-projects");
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [notice, setNotice] = useState("");
  const [movingImageId, setMovingImageId] = useState<string | null>(null);
  const [savingTestimonialId, setSavingTestimonialId] = useState<string | null>(null);
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
  const [bulkProjectLabel, setBulkProjectLabel] = useState("");
  const [bulkCategoryId, setBulkCategoryId] = useState("");
  const [bulkRenameFiles, setBulkRenameFiles] = useState(false);
  const [bulkPreviewOpen, setBulkPreviewOpen] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const queueRef = useRef<ImportBatchProgress[]>([]);
  const processingRef = useRef(false);
  const pauseAfterCurrentRef = useRef(false);
  const cancelAfterCurrentRef = useRef(new Set<string>());
  const developmentHashesRef = useRef(new Map<string, DuplicateReview["existingImage"]>());

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/portfolio").then((response) => response.ok ? response.json() : Promise.reject()),
      fetch("/api/admin/testimonials").then((response) => response.ok ? response.json() : Promise.reject()),
      fetch("/api/admin/contact-submissions").then((response) => response.ok ? response.json() : Promise.reject()),
    ]).then(([portfolio, testimonialResponse, inquiryResponse]) => {
      setImages(portfolio.images);
      setTestimonials(testimonialResponse.testimonials);
      setInquiries(inquiryResponse.inquiries);
      setRemoteReady(true);
      return fetch("/api/admin/duplicate-reviews").then((response) => response.ok ? response.json() : Promise.reject());
    }).then((response) => setDuplicateReviews(response.reviews)).catch(() => setRemoteReady(false));
  }, []);

  const filteredImages = useMemo(() => images.filter((image) => (categoryFilter === "all" || image.categoryId === categoryFilter) && (statusFilter === "all" || image.status === statusFilter)), [categoryFilter, images, statusFilter]);
  const selectedImageIdSet = useMemo(() => new Set(selectedImageIds), [selectedImageIds]);
  const selectedImages = useMemo(() => images.filter((image) => selectedImageIdSet.has(image.id)), [images, selectedImageIdSet]);
  const archiveImages = useMemo(() => images.filter((image) => image.status === "archive").sort((first, second) => first.filename.localeCompare(second.filename)), [images]);
  const reviewImage = archiveImages[Math.min(reviewIndex, Math.max(0, archiveImages.length - 1))];
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

  async function refreshRemoteImages() {
    if (!remoteReady) return;
    try {
      const response = await fetch("/api/admin/portfolio");
      if (!response.ok) return;
      const payload = await response.json();
      setImages(payload.images);
    } catch {
      // The completed-import queue remains useful even if its final refresh
      // is briefly interrupted. The next admin load will retry normally.
    }
  }

  async function setInquiryStatus(inquiry: ContactInquiry, status: ContactInquiry["status"]) {
    try {
      const response = await fetch(`/api/admin/contact-submissions?id=${encodeURIComponent(inquiry.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "This inquiry could not be updated.");
      setInquiries((current) => current.map((entry) => entry.id === inquiry.id ? { ...entry, status } : entry));
      setNotice(status === "archived" ? "Inquiry archived." : "Inquiry status saved.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "This inquiry could not be updated.");
    }
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
    const publishedCount = Number(payload.publishedFamilyCount ?? 0);
    if (publishedCount > 1) setNotice(`Image saved. ${publishedCount} images from this project are now visible.`);
    else setNotice("Image saved.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "This image could not be saved.");
    }
  }

  function toggleImageSelection(id: string) {
    setSelectedImageIds((current) => {
      if (current.includes(id)) return current.filter((imageId) => imageId !== id);
      if (current.length >= MAX_BULK_IMAGES) {
        setNotice(`Bulk corrections are limited to ${MAX_BULK_IMAGES} photos at a time.`);
        return current;
      }
      return [...current, id];
    });
    setBulkPreviewOpen(false);
  }

  function selectVisibleImages() {
    setSelectedImageIds((current) => {
      const combined = [...new Set([...current, ...filteredImages.map((image) => image.id)])];
      if (combined.length > MAX_BULK_IMAGES) setNotice(`Selected the first ${MAX_BULK_IMAGES} photos. Apply that group before selecting more.`);
      return combined.slice(0, MAX_BULK_IMAGES);
    });
    setBulkPreviewOpen(false);
  }

  function clearBulkSelection() {
    setSelectedImageIds([]);
    setBulkProjectLabel("");
    setBulkCategoryId("");
    setBulkRenameFiles(false);
    setBulkPreviewOpen(false);
  }

  async function applyBulkCorrections() {
    const projectLabel = bulkProjectLabel.trim().replace(/\s+/g, " ");
    if (!selectedImages.length) { setNotice("Check the photos you want to correct first."); return; }
    if (bulkRenameFiles && !projectLabel) { setNotice("Enter a project name before generating filenames."); return; }
    if (!projectLabel && !bulkCategoryId) { setNotice("Choose a project name, category, or numbered filenames before reviewing."); return; }
    if (!remoteReady) { setNotice("The Cloudflare database is unavailable, so no bulk corrections were saved."); return; }

    setBulkSaving(true);
    try {
      const response = await fetch("/api/admin/portfolio", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: selectedImages.map((image) => image.id),
          ...(projectLabel ? { projectLabel } : {}),
          ...(bulkCategoryId ? { categoryId: bulkCategoryId } : {}),
          renameSequentially: bulkRenameFiles,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "These corrections could not be saved.");
      await refreshRemoteImages();
      const count = Number(payload.updatedCount ?? selectedImages.length);
      clearBulkSelection();
      setNotice(`${count} checked photo${count === 1 ? " was" : "s were"} corrected. The stored image files were not replaced.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "These corrections could not be saved.");
    } finally {
      setBulkSaving(false);
    }
  }

  async function moveImage(id: string, direction: ImageMoveDirection) {
    if (movingImageId) return;
    const columns = adminGridColumns();
    const previousImages = images;
    const reordered = reorderPortfolioImages(previousImages, id, direction, columns);
    if (!reordered.moved) {
      setNotice("That image is already at the edge of this section.");
      return;
    }

    setImages(reordered.images);
    setMovingImageId(id);

    if (!remoteReady) {
      setNotice("Order updated locally. Connect the Cloudflare database to publish this change.");
      setMovingImageId(null);
      return;
    }

    try {
      const response = await fetch(`/api/admin/portfolio?id=${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ move: direction, columns }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "This image could not be moved.");
      await refreshRemoteImages();
      setNotice("Image order saved.");
    } catch (error) {
      setImages(previousImages);
      setNotice(error instanceof Error ? error.message : "This image could not be moved.");
    } finally {
      setMovingImageId(null);
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
        return { outcome: "skipped", reason: "exact-duplicate" };
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
          } else if (result.outcome === "skipped") {
            updateEntry(clientId, path, { status: "skipped", reviewId: undefined });
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
        await refreshRemoteImages();
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

  async function addTestimonial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const record = { text: String(data.get("text") || ""), clientName: String(data.get("clientName") || ""), isActive: true, displayOrder: testimonials.length + 1 };
    if (!remoteReady) {
      setNotice("The testimonial was not saved because the admin database is unavailable. Please try again after the page reconnects.");
      return;
    }
    setSavingTestimonialId("new");
    try {
      const response = await fetch("/api/admin/testimonials", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(record) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.testimonial) throw new Error(result.error || "The database did not confirm the testimonial.");
      setTestimonials((current) => [...current, result.testimonial]);
      form.reset();
      setNotice("Testimonial saved and published.");
    } catch (error) {
      setNotice(`Testimonial was not saved: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setSavingTestimonialId(null);
    }
  }

  async function setTestimonialActive(testimonial: TestimonialRecord, isActive: boolean) {
    if (!remoteReady) {
      setNotice("The testimonial status was not changed because the admin database is unavailable.");
      return;
    }
    setSavingTestimonialId(testimonial.id);
    try {
      const response = await fetch(`/api/admin/testimonials?id=${encodeURIComponent(testimonial.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "The database did not confirm the status change.");
      setTestimonials((current) => current.map((entry) => entry.id === testimonial.id ? { ...entry, isActive } : entry));
      setNotice(isActive ? "Testimonial published." : "Testimonial unpublished.");
    } catch (error) {
      setNotice(`Testimonial status was not changed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setSavingTestimonialId(null);
    }
  }

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(event.target.files ?? []));
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    addFiles(Array.from(event.dataTransfer.files));
  }

  if (tab === "review") {
    const currentPosition = archiveImages.length ? Math.min(reviewIndex, archiveImages.length - 1) + 1 : 0;
    return (
      <main className="min-h-screen bg-ink px-5 py-8 sm:px-8 lg:py-12">
        <div className="mx-auto max-w-[1000px]">
          <div className="flex flex-wrap items-center justify-between gap-5 border-b border-line pb-6">
            <a href="/" className="inline-flex items-center gap-2 font-body text-sm font-bold uppercase tracking-wide text-bone transition-colors hover:text-orange"><ArrowLeft size={16} aria-hidden="true" /> Return Home</a>
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-orange">Private MTD portfolio manager</span>
          </div>
          <header className="mt-12"><h1 className="font-display text-5xl font-semibold uppercase leading-[0.9] text-bone sm:text-7xl">Portfolio Admin</h1></header>
          <nav className="mt-10 flex flex-wrap gap-x-6 gap-y-3 border-b border-line pb-4" aria-label="Admin sections">
            {tabs.map(([id, label]) => <button type="button" key={id} onClick={() => setTab(id)} className={`text-sm font-bold uppercase tracking-wide ${tab === id ? "text-orange" : "text-bone/60 hover:text-bone"}`}>{label}</button>)}
          </nav>
          {notice && <p className="mt-5 border border-line bg-charcoal2 px-4 py-3 text-sm text-bone/75">{notice}</p>}
          <section className="mt-10">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange">Archive review</p>
            <h2 className="mt-3 font-display text-4xl font-semibold uppercase leading-[0.9] text-bone sm:text-5xl">Choose what leads.</h2>
            <p className="mt-4 max-w-2xl text-bone/65">Every normal upload is automatically placed in Archive and appears in More Work. Review them here one at a time, then promote only the images that should lead a category.</p>
            {!reviewImage ? <p className="mt-8 border border-line p-5 text-sm text-bone/60">There are no Archive images to review yet.</p> : <article className="mt-8 overflow-hidden border border-line bg-charcoal2">
              <img src={reviewImage.imageUrl} alt={reviewImage.altText} className="aspect-[4/3] w-full object-contain bg-ink" />
              <div className="space-y-5 p-5 sm:p-7">
                <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-orange">{shortCategory(reviewImage.categoryId)} · Archive</p><p className="mt-2 break-words text-sm text-bone/70">{reviewImage.filename}</p><label className="mt-3 block text-xs text-bone/60">Category<select value={reviewImage.categoryId} onChange={(event: ChangeEvent<HTMLSelectElement>) => saveImage(reviewImage.id, { categoryId: event.target.value })} className="ml-2 bg-ink px-2 py-1 text-bone">{workCategories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}</select><span className="ml-2 text-bone/40">Only this photo changes.</span></label><p className="mt-2 text-xs text-bone/45">Image {currentPosition} of {archiveImages.length}{reviewImage.isHidden ? " · held for duplicate review" : ""}</p></div><div className="flex gap-2"><button type="button" disabled={currentPosition <= 1} onClick={() => setReviewIndex((index) => Math.max(0, index - 1))} className="border border-line px-3 py-2 text-xs font-bold uppercase text-bone hover:border-orange disabled:opacity-40">Previous</button><button type="button" disabled={currentPosition >= archiveImages.length} onClick={() => setReviewIndex((index) => Math.min(archiveImages.length - 1, index + 1))} className="border border-line px-3 py-2 text-xs font-bold uppercase text-bone hover:border-orange disabled:opacity-40">Next</button></div></div>
                <div className="flex flex-wrap gap-3"><button type="button" onClick={() => saveImage(reviewImage.id, { status: "featured" })} className="bg-orange px-4 py-3 text-xs font-bold uppercase text-ink">Promote to Featured</button><button type="button" onClick={() => saveImage(reviewImage.id, { isCategoryCover: true, status: "featured" })} className="border border-line px-4 py-3 text-xs font-bold uppercase text-bone hover:border-orange">Make Category Cover</button><button type="button" onClick={() => saveImage(reviewImage.id, { isHidden: !reviewImage.isHidden })} className="border border-line px-4 py-3 text-xs font-bold uppercase text-bone hover:border-orange">{reviewImage.isHidden ? "Make visible" : "Hide"}</button></div>
              </div>
            </article>}
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-ink px-5 py-8 sm:px-8 lg:py-12">
      <div className="mx-auto max-w-[1400px]">
        <div className="flex flex-wrap items-center justify-between gap-5 border-b border-line pb-6"><a href="/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-body text-sm font-bold uppercase tracking-wide text-bone transition-colors hover:text-orange"><ArrowLeft size={16} aria-hidden="true" /> View Homepage</a><span className="text-xs font-bold uppercase tracking-[0.18em] text-orange">Private MTD portfolio manager</span></div>
        {!remoteReady && <p className="mt-6 border border-orange/40 bg-charcoal2 px-4 py-3 text-sm text-bone/70">Local development preview. ZIPs are still opened in this browser, but image transfers are simulated until Cloudflare Access, R2, and D1 are connected.</p>}
        <header className="mt-12"><h1 className="font-display text-5xl font-semibold uppercase leading-[0.9] text-bone sm:text-7xl">Portfolio Admin</h1></header>
        <nav className="mt-10 flex flex-wrap gap-x-6 gap-y-3 border-b border-line pb-4" aria-label="Admin sections">{tabs.map(([id, label]) => <button type="button" key={id} onClick={() => setTab(id)} className={`text-sm font-bold uppercase tracking-wide ${tab === id ? "text-orange" : "text-bone/60 hover:text-bone"}`}>{label}</button>)}</nav>
        <nav className="mt-5 border border-line bg-charcoal2 px-4 py-4" aria-label="Live site previews">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange">Live Site Preview · Opens separately</p>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold text-bone/70">
            <a href="/" target="_blank" rel="noreferrer" className="hover:text-orange">Homepage</a>
            <a href="/work" target="_blank" rel="noreferrer" className="hover:text-orange">Work Overview</a>
            {workCategories.map((category) => <a key={category.id} href={`/work/${category.slug}`} target="_blank" rel="noreferrer" className="hover:text-orange">{category.label}</a>)}
          </div>
        </nav>
        {notice && <p className="mt-5 border border-line bg-charcoal2 px-4 py-3 text-sm text-bone/75">{notice}</p>}

        {tab === "inquiries" && (
          <section className="mt-8 max-w-4xl">
            <h2 className="font-display text-3xl font-semibold uppercase text-bone">Project Inquiries</h2>
            <p className="mt-3 text-bone/65">Every successful public contact-form submission is saved here before the visitor sees a confirmation.</p>
            <div className="mt-7 space-y-4">
              {inquiries.length === 0 && <p className="border border-line p-5 text-sm text-bone/60">No project inquiries have been received yet.</p>}
              {inquiries.map((inquiry) => (
                <article key={inquiry.id} className={`border bg-charcoal2 p-5 ${inquiry.status === "new" ? "border-orange/60" : "border-line"}`}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="font-body text-lg font-bold text-bone">{inquiry.name}</p>
                      <p className="mt-1 text-sm text-bone/60">{new Date(`${inquiry.created_at.replace(" ", "T")}Z`).toLocaleString()} · {inquiry.language === "es" ? "Spanish" : "English"} · <span className={inquiry.status === "new" ? "text-orange" : ""}>{inquiry.status}</span> · {inquiry.notification_sent ? "Email alert sent" : "Email alert not sent"}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {inquiry.status !== "read" && <button type="button" onClick={() => void setInquiryStatus(inquiry, "read")} className="min-h-10 border border-line px-3 text-xs font-bold uppercase text-bone hover:border-orange">Mark Read</button>}
                      {inquiry.status !== "archived" && <button type="button" onClick={() => void setInquiryStatus(inquiry, "archived")} className="min-h-10 border border-line px-3 text-xs font-bold uppercase text-bone hover:border-orange">Archive</button>}
                      {inquiry.status === "archived" && <button type="button" onClick={() => void setInquiryStatus(inquiry, "new")} className="min-h-10 border border-line px-3 text-xs font-bold uppercase text-bone hover:border-orange">Restore</button>}
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                    <a href={`mailto:${inquiry.email}`} className="font-bold text-orange hover:text-bone">{inquiry.email}</a>
                    {inquiry.phone && <a href={`tel:${inquiry.phone.replace(/[^\d+]/g, "")}`} className="font-bold text-orange hover:text-bone">{inquiry.phone}</a>}
                  </div>
                  {inquiry.project_details && <p className="mt-4 whitespace-pre-wrap border-t border-line pt-4 text-bone/80">{inquiry.project_details}</p>}
                  {!inquiry.notification_sent && inquiry.notification_error && <p className="mt-3 text-xs text-bone/50">Notification note: {inquiry.notification_error}</p>}
                </article>
              ))}
            </div>
          </section>
        )}

        {tab === "images" && (
          <section className="mt-8">
            <div className="flex flex-wrap items-end gap-4">
              <label className="text-sm text-bone/70">Category filter<select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="ml-2 bg-charcoal2 px-3 py-2 text-bone"><option value="all">All</option>{workCategories.map((category) => <option value={category.id} key={category.id}>{category.label}</option>)}</select></label>
              <label className="text-sm text-bone/70">Status filter<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | PortfolioStatus)} className="ml-2 bg-charcoal2 px-3 py-2 text-bone"><option value="all">All</option><option value="featured">Featured</option><option value="archive">Archive</option></select></label>
            </div>
            {categoryFilter !== "all" && (() => {
              const selected = workCategories.find((category) => category.id === categoryFilter);
              if (!selected) return null;
              return <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border border-line bg-charcoal2 px-4 py-3 text-sm"><span className="font-bold text-bone/60">Check this arrangement:</span><a href={`/work/${selected.slug}`} target="_blank" rel="noreferrer" className="font-bold text-orange hover:text-bone">Featured Gallery</a><a href={`/work/${selected.slug}/archive`} target="_blank" rel="noreferrer" className="font-bold text-orange hover:text-bone">Archive</a></div>;
            })()}
            <div className="mt-5 border border-line bg-charcoal2 p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange">Bulk corrections</p>
                  <p className="mt-2 max-w-2xl text-sm text-bone/65">Check only photos that belong together. Bulk corrections affect only those checked photos; the stored image files are never replaced.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={!filteredImages.length} onClick={selectVisibleImages} className="min-h-10 border border-line px-3 text-xs font-bold uppercase text-bone hover:border-orange disabled:opacity-40">Select visible ({Math.min(filteredImages.length, MAX_BULK_IMAGES)})</button>
                  <button type="button" disabled={!selectedImages.length} onClick={clearBulkSelection} className="min-h-10 border border-line px-3 text-xs font-bold uppercase text-bone hover:border-orange disabled:opacity-40">Clear selection</button>
                </div>
              </div>
              <p className="mt-4 text-sm font-bold text-bone">{selectedImages.length} photo{selectedImages.length === 1 ? "" : "s"} checked</p>
              {selectedImages.length > 0 && (
                <div className="mt-4 grid gap-4 border-t border-line pt-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
                  <label className="block text-xs font-bold uppercase tracking-wide text-bone/60">Project name <span className="normal-case font-normal tracking-normal text-bone/40">— blank keeps current names</span><input value={bulkProjectLabel} maxLength={120} onChange={(event) => { setBulkProjectLabel(event.target.value); setBulkPreviewOpen(false); }} placeholder="Example: Brown Bear Carpet Cleaning" className="mt-2 block min-h-11 w-full bg-ink px-3 text-sm normal-case tracking-normal text-bone" /></label>
                  <label className="block text-xs font-bold uppercase tracking-wide text-bone/60">Category <span className="normal-case font-normal tracking-normal text-bone/40">— blank keeps current categories</span><select value={bulkCategoryId} onChange={(event) => { setBulkCategoryId(event.target.value); setBulkPreviewOpen(false); }} className="mt-2 block min-h-11 w-full bg-ink px-3 text-sm normal-case tracking-normal text-bone"><option value="">Keep current categories</option>{workCategories.map((category) => <option value={category.id} key={category.id}>{category.label}</option>)}</select></label>
                  <label className="flex min-h-11 items-center gap-3 border border-line px-3 text-sm text-bone/75"><input type="checkbox" checked={bulkRenameFiles} onChange={(event) => { setBulkRenameFiles(event.target.checked); setBulkPreviewOpen(false); }} /> Number filenames from project name</label>
                  <div className="lg:col-span-3 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-bone/45">Numbering follows the checked photos’ current gallery order.</p>
                    <button type="button" disabled={!bulkProjectLabel.trim() && !bulkCategoryId || bulkRenameFiles && !bulkProjectLabel.trim()} onClick={() => setBulkPreviewOpen(true)} className="min-h-11 bg-orange px-5 text-xs font-bold uppercase text-ink disabled:cursor-not-allowed disabled:opacity-40">Review changes</button>
                  </div>
                </div>
              )}
            </div>

            {bulkPreviewOpen && selectedImages.length > 0 && (
              <div className="mt-5 border border-orange/60 bg-charcoal2 p-4 sm:p-6" role="region" aria-label="Review bulk photo corrections">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange">Review before saving</p>
                <h3 className="mt-2 font-display text-3xl font-semibold uppercase text-bone">Exactly {selectedImages.length} checked photo{selectedImages.length === 1 ? "" : "s"}</h3>
                <p className="mt-2 text-sm text-bone/60">Nothing changes until you use Apply Corrections below.</p>
                <div className="mt-5 max-h-[34rem] space-y-3 overflow-y-auto pr-1">
                  {selectedImages.map((image, index) => {
                    const nextFilename = bulkRenameFiles ? numberedFilename(bulkProjectLabel.trim(), index, selectedImages.length, image.filename) : displayFilename(image.filename);
                    return (
                      <article key={image.id} className="grid gap-3 border border-line bg-ink p-3 sm:grid-cols-[7rem_1fr]">
                        <img src={image.imageUrl} alt="" className="aspect-[4/3] w-full object-cover" />
                        <dl className="grid min-w-0 gap-x-4 gap-y-2 text-xs sm:grid-cols-[5rem_1fr]">
                          <dt className="font-bold uppercase text-bone/45">Filename</dt><dd className="min-w-0 break-words text-bone/75">{displayFilename(image.filename)}{bulkRenameFiles && <><span className="mx-2 text-orange">→</span><span className="font-bold text-bone">{nextFilename}</span></>}</dd>
                          <dt className="font-bold uppercase text-bone/45">Project</dt><dd className="break-words text-bone/75">{image.projectLabel || "Unassigned"}{bulkProjectLabel.trim() && <><span className="mx-2 text-orange">→</span><span className="font-bold text-bone">{bulkProjectLabel.trim()}</span></>}</dd>
                          <dt className="font-bold uppercase text-bone/45">Category</dt><dd className="text-bone/75">{shortCategory(image.categoryId)}{bulkCategoryId && <><span className="mx-2 text-orange">→</span><span className="font-bold text-bone">{shortCategory(bulkCategoryId)}</span></>}</dd>
                        </dl>
                      </article>
                    );
                  })}
                </div>
                <div className="mt-5 flex flex-wrap justify-end gap-3 border-t border-line pt-5">
                  <button type="button" disabled={bulkSaving} onClick={() => setBulkPreviewOpen(false)} className="min-h-11 border border-line px-4 text-xs font-bold uppercase text-bone hover:border-orange disabled:opacity-40">Back</button>
                  <button type="button" disabled={bulkSaving} onClick={() => void applyBulkCorrections()} className="min-h-11 bg-orange px-5 text-xs font-bold uppercase text-ink disabled:opacity-50">{bulkSaving ? "Saving…" : `Apply corrections to ${selectedImages.length}`}</button>
                </div>
              </div>
            )}

            <p className="mt-5 text-sm text-bone/55">Per-photo category changes save immediately. Filename and project edits save when you leave the field. The arrow controls change gallery order.</p>
            <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredImages.map((image) => (
                <article className={`border bg-charcoal2 ${selectedImageIdSet.has(image.id) ? "border-orange" : "border-line"}`} key={image.id}>
                  <div className="relative">
                    <img src={image.imageUrl} alt={image.altText} className="aspect-[4/3] w-full object-cover" />
                    <label className="absolute left-3 top-3 flex min-h-10 cursor-pointer items-center gap-2 border border-bone/25 bg-ink/90 px-3 text-xs font-bold uppercase text-bone shadow-lg"><input type="checkbox" checked={selectedImageIdSet.has(image.id)} onChange={() => toggleImageSelection(image.id)} /> Select</label>
                  </div>
                  <div className="space-y-3 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-orange">{shortCategory(image.categoryId)} · {image.status}</p>
                    <label className="block text-xs text-bone/60">Filename<input key={image.filename} defaultValue={displayFilename(image.filename)} maxLength={180} onBlur={(event) => { let filename = event.currentTarget.value.trim(); if (filename && !/\.(jpe?g|png|webp|avif)$/i.test(filename)) filename += filenameExtension(image.filename); if (filename && filename !== displayFilename(image.filename)) void saveImage(image.id, { filename }); }} className="mt-1 block w-full bg-ink px-2 py-1 text-sm text-bone" /></label>
                    <label className="block text-xs text-bone/60">
                      Category — this photo
                      <select value={image.categoryId} onChange={(event: ChangeEvent<HTMLSelectElement>) => saveImage(image.id, { categoryId: event.target.value })} className="ml-2 bg-ink px-2 py-1 text-bone">
                        {workCategories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
                      </select>
                    </label>
                    <label className="block text-xs text-bone/60">
                      Project — this photo
                      <input key={image.projectLabel ?? ""} defaultValue={image.projectLabel ?? ""} maxLength={120} onBlur={(event) => { if (event.currentTarget.value.trim() !== (image.projectLabel ?? "")) void saveImage(image.id, { projectLabel: event.currentTarget.value }); }} placeholder="Automatic from filename" className="mt-1 block w-full bg-ink px-2 py-1 text-sm text-bone" />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => saveImage(image.id, { status: image.status === "featured" ? "archive" : "featured" })} className="border border-line px-2 py-1 text-xs font-bold text-bone hover:border-orange">{image.status === "featured" ? "Demote to Archive" : "Promote to Featured"}</button>
                      <button type="button" onClick={() => saveImage(image.id, { isCategoryCover: true, status: "featured" })} className="border border-line px-2 py-1 text-xs font-bold text-bone hover:border-orange">Make Category Cover</button>
                      <button type="button" onClick={() => saveImage(image.id, { isHidden: !image.isHidden })} className="border border-line p-1 text-bone hover:border-orange" aria-label={image.isHidden ? "Make visible" : "Hide"}>{image.isHidden ? <Eye size={15} /> : <EyeOff size={15} />}</button>
                      <button type="button" onClick={() => removeImage(image.id)} className="border border-line p-1 text-bone hover:border-orange" aria-label="Delete"><Trash2 size={15} /></button>
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
                      <span className="text-xs font-bold uppercase tracking-[0.12em] text-bone/55">Move image</span>
                      <div className="grid grid-cols-4 gap-1">
                        <button type="button" disabled={movingImageId === image.id} onClick={() => void moveImage(image.id, "left")} aria-label={`Move ${image.filename} left`} title="Move left" className="flex h-9 w-9 items-center justify-center border border-line text-bone hover:border-orange hover:text-orange disabled:opacity-35"><ChevronLeft size={17} /></button>
                        <button type="button" disabled={movingImageId === image.id} onClick={() => void moveImage(image.id, "right")} aria-label={`Move ${image.filename} right`} title="Move right" className="flex h-9 w-9 items-center justify-center border border-line text-bone hover:border-orange hover:text-orange disabled:opacity-35"><ChevronRight size={17} /></button>
                        <button type="button" disabled={movingImageId === image.id} onClick={() => void moveImage(image.id, "up")} aria-label={`Move ${image.filename} up`} title="Move up one row" className="flex h-9 w-9 items-center justify-center border border-line text-bone hover:border-orange hover:text-orange disabled:opacity-35"><ChevronUp size={17} /></button>
                        <button type="button" disabled={movingImageId === image.id} onClick={() => void moveImage(image.id, "down")} aria-label={`Move ${image.filename} down`} title="Move down one row" className="flex h-9 w-9 items-center justify-center border border-line text-bone hover:border-orange hover:text-orange disabled:opacity-35"><ChevronDown size={17} /></button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {tab === "upload" && <section className="mt-8 max-w-4xl"><h2 className="font-display text-3xl font-semibold uppercase text-bone">Browser ZIP Import</h2><p className="mt-3 max-w-2xl text-bone/65">Choose original Claude ZIP packages exactly as they are. Each ZIP is opened locally in this browser. Images are extracted and sent one at a time; ZIPs, CSV logs, Markdown reports, and notes are never placed in the public site.</p><label onDragOver={(event) => event.preventDefault()} onDrop={handleDrop} className="mt-7 block cursor-pointer border border-dashed border-line bg-charcoal2 p-6 text-center transition-colors hover:border-orange"><Upload className="mx-auto text-orange" size={22} aria-hidden="true" /><span className="mt-3 block font-body text-sm font-bold uppercase tracking-wide text-bone">Choose ZIP Files or Images</span><span className="mt-2 block text-sm text-bone/55">Original ZIPs up to at least 250 MB are accepted. Large packages run one at a time.</span><input onChange={handleFileInput} type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif,.zip" className="sr-only" /></label><div className="mt-5 flex flex-wrap items-center gap-5"><label className="text-sm text-bone/70">Category for unclear filenames<select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)} className="ml-2 bg-charcoal2 px-3 py-2 text-bone">{workCategories.map((category) => <option value={category.id} key={category.id}>{category.label}</option>)}</select></label><p className="text-sm text-bone/55">Clear filename matches are assigned automatically. Unclear files now default to Specialty Projects, never Vehicle Wraps.</p><label className="inline-flex items-center gap-2 text-sm text-bone/70"><input checked={autoAdvance} onChange={(event) => setAutoAdvance(event.target.checked)} type="checkbox" /> Continue automatically to the next ZIP</label></div>{overall.total > 0 && <p className="mt-6 text-sm text-bone/70">Overall progress: <span className="font-bold text-bone">{overall.complete} of {overall.total} images complete</span></p>}<div className="mt-7 space-y-4">{zipQueue.length === 0 ? <p className="border border-line p-5 text-sm text-bone/60">No files are queued yet. You can add a few ZIPs now and continue with more in another session.</p> : zipQueue.map((item) => { const total = item.entries.filter((entry) => entry.kind === "image").length; const complete = item.uploaded + item.skipped + item.duplicates; return <article key={item.clientId} className="border border-line bg-charcoal2 p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="font-body text-sm font-bold text-bone">{item.sourceName}</p><p className="mt-1 text-xs text-bone/55">{formatBytes(item.sourceSize)} · {item.status.replace("-", " ")}</p></div><div className="flex flex-wrap gap-2">{["queued", "paused", "failed"].includes(item.status) && <button type="button" onClick={() => void startImport(item.clientId)} disabled={isProcessing} className="inline-flex min-h-11 items-center gap-2 border border-line px-3 text-xs font-bold uppercase text-bone hover:border-orange disabled:opacity-50"><Play size={14} /> {item.status === "paused" ? "Resume" : "Import"}</button>}{item.status === "processing" && <button type="button" onClick={() => { pauseAfterCurrentRef.current = true; setNotice("This ZIP will pause after the image currently uploading finishes."); }} className="inline-flex min-h-11 items-center gap-2 border border-line px-3 text-xs font-bold uppercase text-bone hover:border-orange"><Pause size={14} /> Pause after current</button>}{item.failed > 0 && <button type="button" onClick={() => retryFailed(item.clientId)} disabled={isProcessing} className="inline-flex min-h-11 items-center gap-2 border border-line px-3 text-xs font-bold uppercase text-bone hover:border-orange disabled:opacity-50"><RotateCcw size={14} /> Retry failed</button>}{["queued", "reading", "processing", "paused"].includes(item.status) && <button type="button" onClick={() => { cancelAfterCurrentRef.current.add(item.clientId); if (item.status !== "processing") updateQueueItem(item.clientId, (current) => ({ ...current, status: "cancelled" })); }} className="inline-flex min-h-11 items-center gap-2 border border-line px-3 text-xs font-bold uppercase text-bone hover:border-orange"><X size={14} /> Cancel</button>}</div></div><p className="mt-4 text-sm text-bone/75">{total ? `${item.sourceName} — ${complete} of ${total} images uploaded or reviewed` : item.status === "reading" ? "Reading the local ZIP directory…" : "Ready to read the ZIP directory."}</p>{item.currentFilename && <p className="mt-2 text-xs font-bold uppercase tracking-wide text-orange">Current image: {displayFilename(item.currentFilename)}</p>}{item.sourceSize >= 200 * 1024 * 1024 && <p className="mt-3 text-sm text-orange">Large ZIP: it will be processed locally one image at a time.</p>}{item.message && <p className="mt-3 text-sm text-orange">{item.message}</p>}{item.entries.some((entry) => entry.status === "failed" || entry.kind === "unsupported") && <ul className="mt-4 space-y-1 border-t border-line pt-3 text-xs text-bone/60">{item.entries.filter((entry) => entry.status === "failed" || entry.kind === "unsupported").map((entry) => <li key={entry.path}><span className="font-bold text-orange">{entry.status === "failed" ? "Needs retry:" : "Skipped:"}</span> {entry.path}{entry.error || entry.reason ? ` — ${entry.error ?? entry.reason}` : ""}</li>)}</ul>}</article>; })}</div></section>}

        {tab === "duplicates" && <section className="mt-8 max-w-4xl"><h2 className="font-display text-3xl font-semibold uppercase text-bone">Duplicate Review</h2><p className="mt-3 text-bone/65">Byte-for-byte duplicates are discarded automatically. Only potential visual matches wait here so you can compare them before deciding.</p>{duplicateReviews.length === 0 ? <p className="mt-6 border border-line p-5 text-sm text-bone/60">No duplicate decisions are waiting.</p> : <div className="mt-6 space-y-5">{duplicateReviews.map((review) => <article key={review.id} className="border border-line bg-charcoal2 p-5"><p className="text-xs font-bold uppercase tracking-[0.16em] text-orange">Potential duplicate</p><p className="mt-2 text-sm text-bone">{displayFilename(review.sourceFilename)} <span className="text-bone/55">from {review.sourceZip}</span></p><div className="mt-5 grid gap-4 sm:grid-cols-2">{[["Existing image", review.existingImage], ["Incoming image", review.incomingImage]].map(([label, image]) => <div className="border border-line p-3" key={String(label)}><p className="text-xs font-bold uppercase tracking-wide text-bone/60">{label}</p>{typeof image === "object" && image && "imageUrl" in image && image.imageUrl ? <img src={String(image.imageUrl)} alt={`${label} preview`} className="mt-3 aspect-[4/3] w-full object-cover" /> : <div className="mt-3 flex aspect-[4/3] items-center justify-center bg-ink px-3 text-center text-xs text-bone/45">Preview stays local until an owner decision requires the individual image.</div>}<p className="mt-3 break-words text-sm text-bone/75">{typeof image === "object" && image && "filename" in image ? image.filename : "No incoming file stored"}</p>{typeof image === "object" && image && "sourceZip" in image && image.sourceZip && <p className="mt-1 text-xs text-bone/50">{String(image.sourceZip)}</p>}</div>)}</div><div className="mt-5 flex flex-wrap gap-2"><button type="button" onClick={() => void resolveDuplicate(review, "keep-existing-only")} className="min-h-11 border border-line px-3 text-xs font-bold uppercase text-bone hover:border-orange">Keep existing only</button><button type="button" onClick={() => void resolveDuplicate(review, "keep-new-only")} className="min-h-11 border border-line px-3 text-xs font-bold uppercase text-bone hover:border-orange">Keep new only</button><button type="button" onClick={() => void resolveDuplicate(review, "keep-both")} className="min-h-11 border border-line px-3 text-xs font-bold uppercase text-bone hover:border-orange">Keep both</button><button type="button" onClick={() => void resolveDuplicate(review, "use-existing-in-category")} className="min-h-11 border border-line px-3 text-xs font-bold uppercase text-bone hover:border-orange">Use existing in selected category</button></div></article>)}</div>}</section>}

        {tab === "testimonials" && <section className="mt-8 max-w-3xl"><h2 className="font-display text-3xl font-semibold uppercase text-bone">Testimonials</h2><p className="mt-3 text-bone/65">New testimonials publish when the database confirms they are saved. Use Publish or Unpublish below to control the homepage carousel.</p><form onSubmit={addTestimonial} className="mt-6 grid gap-3"><input name="clientName" required placeholder="Client name" className="border border-line bg-transparent px-3 py-3 text-bone" /><textarea name="text" required rows={4} placeholder="Testimonial text" className="border border-line bg-transparent px-3 py-3 text-bone" /><button type="submit" disabled={!remoteReady || savingTestimonialId !== null} className="w-fit bg-orange px-5 py-3 text-sm font-bold uppercase text-ink disabled:cursor-not-allowed disabled:opacity-45">{savingTestimonialId === "new" ? "Publishing…" : "Publish Testimonial"}</button></form><div className="mt-7 space-y-3">{testimonials.length === 0 && <p className="border border-line p-5 text-sm text-bone/60">No saved testimonials yet.</p>}{testimonials.map((testimonial) => <article key={testimonial.id} className="border border-line bg-charcoal2 p-4"><p className="text-bone">{testimonial.text}</p><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-bone/55">{testimonial.clientName} · <span className={testimonial.isActive ? "text-orange" : ""}>{testimonial.isActive ? "Published" : "Unpublished"}</span></p><button type="button" disabled={savingTestimonialId !== null} onClick={() => void setTestimonialActive(testimonial, !testimonial.isActive)} className="min-h-10 border border-line px-3 text-xs font-bold uppercase text-bone hover:border-orange disabled:cursor-not-allowed disabled:opacity-45">{savingTestimonialId === testimonial.id ? "Saving…" : testimonial.isActive ? "Unpublish" : "Publish"}</button></div></article>)}</div></section>}
      </div>
    </main>
  );
}
