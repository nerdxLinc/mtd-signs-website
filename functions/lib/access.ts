import { createRemoteJWKSet, jwtVerify } from "jose";

export type Env = {
  DB: D1Database;
  PORTFOLIO_BUCKET: R2Bucket;
  ASSETS: {
    fetch(input: Request | string | URL, init?: RequestInit): Promise<Response>;
  };
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_EMAIL_API_TOKEN?: string;
  CF_ACCESS_TEAM_DOMAIN?: string;
  CF_ACCESS_AUD?: string;
};

const DEFAULT_ACCESS_TEAM_DOMAIN = "https://icy-forest-091f.cloudflareaccess.com";
const DEFAULT_ACCESS_AUD = "c39659b24d588c1b9c3a6d9415c8f46f816ae00f8b835c2343328f54ba727ab9";
const accessKeySets = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

export function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), { ...init, headers: { "content-type": "application/json; charset=utf-8", ...init.headers } });
}

export function getAccessEmail(request: Request) {
  return request.headers.get("Cf-Access-Authenticated-User-Email");
}

export async function getVerifiedAccessEmail(request: Request, env: Env) {
  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!token) return null;

  const teamDomain = (env.CF_ACCESS_TEAM_DOMAIN || DEFAULT_ACCESS_TEAM_DOMAIN).replace(/\/+$/, "");
  const audience = env.CF_ACCESS_AUD || DEFAULT_ACCESS_AUD;
  let keySet = accessKeySets.get(teamDomain);
  if (!keySet) {
    keySet = createRemoteJWKSet(new URL(`${teamDomain}/cdn-cgi/access/certs`));
    accessKeySets.set(teamDomain, keySet);
  }

  try {
    const { payload } = await jwtVerify(token, keySet, {
      issuer: teamDomain,
      audience,
    });
    return typeof payload.email === "string" && payload.email.trim() ? payload.email.trim() : null;
  } catch {
    return null;
  }
}

export function requireAdmin(request: Request) {
  const email = getAccessEmail(request);
  if (!email) return json({ error: "Cloudflare Access authentication is required." }, { status: 401 });
  return email;
}

export function publicImageUrl(id: string) { return `/api/image?id=${encodeURIComponent(id)}`; }
export function adminImageUrl(id: string) { return `/api/admin/image?id=${encodeURIComponent(id)}`; }

export function contentTypeFor(filename: string, fallback = "application/octet-stream") {
  const extension = filename.toLowerCase().split(".").pop();
  return ({ jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", avif: "image/avif" } as Record<string, string>)[extension ?? ""] ?? fallback;
}

export function isSupportedImage(filename: string) {
  return /\.(jpe?g|png|webp|avif)$/i.test(filename);
}

export async function sha256(bytes: ArrayBuffer) {
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function imageDimensions(bytes: Uint8Array, contentType: string) {
  if (contentType === "image/png" && bytes.length > 24) return { width: new DataView(bytes.buffer, bytes.byteOffset).getUint32(16), height: new DataView(bytes.buffer, bytes.byteOffset).getUint32(20) };
  if (contentType === "image/jpeg") {
    for (let index = 2; index < bytes.length - 9; index += 1) {
      if (bytes[index] !== 0xff) continue;
      const marker = bytes[index + 1];
      const length = (bytes[index + 2] << 8) + bytes[index + 3];
      if (marker >= 0xc0 && marker <= 0xc3) return { height: (bytes[index + 5] << 8) + bytes[index + 6], width: (bytes[index + 7] << 8) + bytes[index + 8] };
      index += length + 1;
    }
  }
  if (contentType === "image/webp" && bytes.length > 30) {
    const type = String.fromCharCode(...bytes.slice(12, 16));
    if (type === "VP8X") return { width: 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16), height: 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16) };
  }
  return { width: null, height: null };
}
