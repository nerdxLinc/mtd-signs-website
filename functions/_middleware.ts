import { getAccessEmail, type Env } from "./lib/access";
import {
  SITE_URL,
  adminSeo,
  categorySeo,
  homeSeo,
  normalizePathname,
  notFoundSeo,
  projectSeo,
  renderSeoHtml,
  type RouteSeo,
} from "./lib/seo";

function isLikelyDocument(pathname: string, request: Request) {
  if (pathname === "/" || pathname.startsWith("/work") || pathname.startsWith("/projects/") || pathname.startsWith("/admin")) return true;
  if (pathname.includes(".")) return false;
  const accept = request.headers.get("accept") ?? "";
  return accept.includes("text/html") || accept.includes("*/*") || accept === "";
}

function projectUnavailableSeo(projectKey: string): RouteSeo {
  const readableLabel = projectKey
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim() || "Portfolio";
  return {
    title: `${readableLabel} Project | MTD Signs & Graphics`,
    heading: readableLabel,
    description: "This MTD Signs & Graphics project is temporarily unavailable.",
    canonical: `${SITE_URL}/projects/${encodeURIComponent(projectKey)}`,
    robots: "noindex, follow",
    pageType: "WebPage",
  };
}

async function appShell(env: Env, request: Request) {
  const shellUrl = new URL("/", request.url);
  const headers = new Headers(request.headers);
  headers.set("accept", "text/html");
  return env.ASSETS.fetch(new Request(shellUrl, { method: "GET", headers }));
}

export const onRequest: PagesFunction<Env> = async ({ request, next, env }) => {
  const url = new URL(request.url);
  const pathname = normalizePathname(url.pathname);

  if (url.hostname === "mtdsigns.com") {
    const destination = new URL(`${url.pathname}${url.search}`, `${SITE_URL}/`);
    return Response.redirect(destination.toString(), 301);
  }

  if (url.pathname === "/admin" || url.pathname.startsWith("/admin/")) {
    if (!getAccessEmail(request)) return new Response("Cloudflare Access authentication is required.", { status: 401 });
  }

  if (pathname === "/work") {
    const destination = new URL("/#work", request.url);
    return Response.redirect(destination.toString(), 301);
  }

  if ((request.method !== "GET" && request.method !== "HEAD") || url.pathname.startsWith("/api/") || !isLikelyDocument(pathname, request)) {
    return next();
  }

  let metadata: RouteSeo;
  let status = 200;

  if (pathname === "/") {
    metadata = homeSeo();
  } else if (pathname === "/admin") {
    metadata = adminSeo();
  } else {
    const categoryMetadata = categorySeo(pathname);
    const projectMatch = pathname.match(/^\/projects\/([^/]+)$/);

    if (categoryMetadata) {
      metadata = categoryMetadata;
    } else if (projectMatch) {
      let projectKey: string;
      try {
        projectKey = decodeURIComponent(projectMatch[1]);
      } catch {
        projectKey = "";
      }

      try {
        const resolvedProject = projectKey ? await projectSeo(env, projectKey) : null;
        if (resolvedProject) {
          metadata = resolvedProject;
        } else {
          metadata = notFoundSeo();
          status = 404;
        }
      } catch {
        metadata = projectUnavailableSeo(projectKey);
        status = 503;
      }
    } else {
      metadata = notFoundSeo();
      status = 404;
    }
  }

  const shell = await appShell(env, request);
  if (!shell.ok) return shell;
  const html = await shell.text();
  const rendered = renderSeoHtml(html, metadata, status);
  const headers = new Headers(shell.headers);
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set("cache-control", "public, max-age=0, must-revalidate");
  headers.delete("content-length");
  headers.delete("etag");
  if (metadata.robots.startsWith("noindex")) headers.set("x-robots-tag", metadata.robots);

  return new Response(request.method === "HEAD" ? null : rendered, {
    status,
    statusText: status === 404 ? "Not Found" : status === 503 ? "Service Unavailable" : "OK",
    headers,
  });
};
