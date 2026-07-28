import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

type ImageLightboxProps = {
  open: boolean;
  src: string;
  alt: string;
  closeLabel: string;
  onClose: () => void;
};

export default function ImageLightbox({ open, src, alt, closeLabel, onClose }: ImageLightboxProps) {
  const lightboxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    lightboxRef.current?.focus();

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
      ref={lightboxRef}
      className="fixed inset-0 z-[100] flex cursor-zoom-out select-none items-center justify-center bg-black/90 p-3 outline-none sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label={`${alt}. ${closeLabel}`}
      tabIndex={-1}
      data-image-lightbox
      onClick={onClose}
      onContextMenu={(event) => event.preventDefault()}
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        className="pointer-events-none max-h-[calc(100dvh-1.5rem)] max-w-[calc(100vw-1.5rem)] object-contain sm:max-h-[calc(100dvh-4rem)] sm:max-w-[calc(100vw-4rem)]"
      />
    </div>,
    document.body,
  );
}

