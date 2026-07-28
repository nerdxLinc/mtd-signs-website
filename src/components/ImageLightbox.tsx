import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type ImageLightboxProps = {
  open: boolean;
  src: string;
  alt: string;
  closeLabel: string;
  onClose: () => void;
};

export default function ImageLightbox({ open, src, alt, closeLabel, onClose }: ImageLightboxProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex cursor-zoom-out items-center justify-center bg-black/90 p-3 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      data-image-lightbox
      onClick={onClose}
    >
      <button
        ref={closeButtonRef}
        type="button"
        className="absolute right-3 top-3 z-10 flex h-11 w-11 cursor-pointer items-center justify-center bg-transparent text-bone/70 transition-colors hover:text-orange focus-visible:text-orange sm:right-5 sm:top-5"
        aria-label={closeLabel}
        onClick={onClose}
      >
        <X size={28} strokeWidth={1.5} aria-hidden="true" />
      </button>
      <img
        src={src}
        alt={alt}
        className="max-h-[calc(100dvh-1.5rem)] max-w-[calc(100vw-1.5rem)] cursor-default object-contain sm:max-h-[calc(100dvh-4rem)] sm:max-w-[calc(100vw-4rem)]"
        onClick={(event) => event.stopPropagation()}
      />
    </div>,
    document.body,
  );
}

