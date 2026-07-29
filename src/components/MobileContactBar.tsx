import { useEffect, useState } from "react";
import { useTranslation } from "../lib/i18n";

const MOBILE_SHELL_QUERY = "(max-width: 639px), (min-width: 568px) and (max-width: 959px) and (max-height: 500px) and (orientation: landscape)";

function shouldHideContactBar() {
  const activeElement = document.activeElement;
  const isEditing = activeElement instanceof HTMLElement
    && activeElement.matches("input, textarea, select, [contenteditable='true']");
  const hasOverlay = Boolean(document.querySelector("[role='dialog'][aria-modal='true'], [data-modal-open='true'], [data-lightbox-open='true'], [data-menu-open='true']"));
  const keyboardOpen = Boolean(window.visualViewport && window.innerHeight - window.visualViewport.height > 160);

  return window.location.pathname.startsWith("/admin") || isEditing || hasOverlay || keyboardOpen;
}

export default function MobileContactBar() {
  const { t } = useTranslation();
  const [hidden, setHidden] = useState(() => shouldHideContactBar());
  const [contactVisibility, setContactVisibility] = useState<"unknown" | "visible" | "outside">("unknown");

  useEffect(() => {
    const sync = () => setHidden(shouldHideContactBar());
    const afterFocusChange = () => window.setTimeout(sync, 0);
    const observer = new MutationObserver(sync);

    window.addEventListener("hashchange", sync);
    document.addEventListener("focusin", sync);
    document.addEventListener("focusout", afterFocusChange);
    window.visualViewport?.addEventListener("resize", sync);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-modal", "data-modal-open", "data-lightbox-open", "data-menu-open"] });
    sync();

    return () => {
      window.removeEventListener("hashchange", sync);
      document.removeEventListener("focusin", sync);
      document.removeEventListener("focusout", afterFocusChange);
      window.visualViewport?.removeEventListener("resize", sync);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const mobileShell = window.matchMedia(MOBILE_SHELL_QUERY);
    let contactObserver: IntersectionObserver | undefined;

    const observeContact = () => {
      contactObserver?.disconnect();

      if (!mobileShell.matches) {
        setContactVisibility("outside");
        return;
      }

      const contactSection = document.getElementById("contact");
      const scrollRoot = document.querySelector<HTMLElement>(".public-page-scroll");

      if (!contactSection || !scrollRoot) {
        setContactVisibility("unknown");
        return;
      }

      contactObserver = new IntersectionObserver(
        ([entry]) => setContactVisibility(entry.isIntersecting ? "visible" : "outside"),
        { root: scrollRoot, threshold: 0.08 },
      );
      contactObserver.observe(contactSection);
    };

    observeContact();
    mobileShell.addEventListener("change", observeContact);

    return () => {
      mobileShell.removeEventListener("change", observeContact);
      contactObserver?.disconnect();
    };
  }, []);

  const isWaitingForContactCheck = window.location.hash === "#contact" && contactVisibility === "unknown";

  if (hidden || contactVisibility === "visible" || isWaitingForContactCheck) return null;

  return (
    <nav className="mobile-contact-bar relative z-50 flex min-h-16 border-t border-line bg-ink px-4 pb-[env(safe-area-inset-bottom)] pt-2 sm:hidden" aria-label={t("mobileContactActions")}>
      <a href="tel:5013291111" className="flex min-h-11 flex-1 items-center justify-center border border-line px-3 text-center font-body text-sm font-bold text-bone transition-colors hover:border-blue hover:text-blue">
        {t("callUs")}
      </a>
      <a href="/#contact" className="ml-3 flex min-h-11 flex-1 items-center justify-center bg-orange px-3 text-center font-body text-sm font-bold text-ink transition-colors hover:bg-orange-dim">
        {t("startProject")}
      </a>
    </nav>
  );
}
