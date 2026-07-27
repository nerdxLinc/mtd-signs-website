import { getAccessEmail } from "./lib/access";

export const onRequest: PagesFunction = async ({ request, next }) => {
  const url = new URL(request.url);
  if (url.pathname === "/admin" || url.pathname.startsWith("/admin/")) {
    if (!getAccessEmail(request)) return new Response("Cloudflare Access authentication is required.", { status: 401 });
  }
  return next();
};
