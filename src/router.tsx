import { useEffect, useState, type AnchorHTMLAttributes, type MouseEvent, type ReactNode } from "react";

type RouterLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  to: string;
  children: ReactNode;
};

function notifyLocationChange() {
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function scrollPublicPageToTop() {
  const publicPageScroll = document.querySelector<HTMLElement>(".public-page-scroll");

  if (publicPageScroll) {
    publicPageScroll.scrollTo({ top: 0, behavior: "auto" });
    return;
  }

  window.scrollTo({ top: 0, behavior: "auto" });
}

export function useBrowserPath() {
  const [path, setPath] = useState(() => window.location.pathname);

  useEffect(() => {
    const updatePath = () => setPath(window.location.pathname);
    window.addEventListener("popstate", updatePath);
    return () => window.removeEventListener("popstate", updatePath);
  }, []);

  return path;
}

export function RouterLink({ to, onClick, children, ...props }: RouterLinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || to.startsWith("#")) return;

    event.preventDefault();
    window.history.pushState({}, "", to);
    scrollPublicPageToTop();
    notifyLocationChange();
  }

  return <a href={to} onClick={handleClick} {...props}>{children}</a>;
}
