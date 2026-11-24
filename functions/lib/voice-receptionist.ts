import type { Env } from "./access";

export type VoiceEnv = Env & {
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_PHONE_NUMBER?: string;
  MTD_SMS_ALERT_TO?: string;
};

export const PHONE_POLICY_VERSION = "mtd-missed-calls-v1";

export function xmlEscape(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

export function twiml(content: string, status = 200) {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${content}</Response>`, {
    status,
    headers: { "content-type": "text/xml; charset=utf-8", "cache-control": "no-store" },
  });
}

export function say(message: string) {
  return `<Say language="en-US">${xmlEscape(message)}</Say>`;
}

export function listen(request: Request, stage: string, prompt: string, options: { digits?: number } = {}) {
  const action = new URL(request.url);
  action.search = `?step=${encodeURIComponent(stage)}`;
  const attrs = options.digits
    ? `input="dtmf" numDigits="${options.digits}" timeout="9"`
    : `input="speech dtmf" numDigits="1" speechTimeout="auto" timeout="7"`;
  return `<Gather ${attrs} action="${xmlEscape(action.toString())}" method="POST" actionOnEmptyResult="true">${say(prompt)}</Gather>`;
}

export function looksLikePhone(value: string | null | undefined) {
  return !!value && /^\+1[2-9]\d{9}$/.test(value);
}

export function isExplicitSolicitation(raw: string) {
  const text = raw.toLowerCase();
  // The safest default is to KEEP a borderline inquiry. Only explicit vendor
  // pitches can be separated from leads without a callback notification.
  const requestsGraphics = /\b(need|want|order|quote|print|make|design|wrap|letter|buy)\b.{0,75}\b(signs?|banners?|decals?|wraps?|logos?|shirts?|graphics?)\b/i.test(text);
  if (requestsGraphics) return false;
  return /\b(sell you|selling you|offer you (our|a)|marketing services|seo services|we generate leads|we can get you (more )?customers|want to pitch|advertising services|business funding|merchant cash advance|made an ai agent for (you|your business)|ai implementation advisor)\b/i.test(text);
}

export function classifyNoncustomerCall(raw: string): "solicitation" | "collection" | "robocall" | null {
  const text = raw.toLowerCase();
  // A print/sign request made by a debt collector or marketer is still a
  // potential customer. Favor false negatives over lost sales leads.
  if (/\b(need|want|order|quote|print|make|design|wrap|letter|buy)\b.{0,75}\b(signs?|banners?|decals?|wraps?|logos?|shirts?|graphics?)\b/i.test(text)) return null;
  if (isExplicitSolicitation(text)) return "solicitation";
  // Debt-related calls can carry important notices: keep them available for
  // review in the admin inbox, even though they are not sales leads.
  if (/\b(debt collect(?:or|ion|ions)?|collection agency|collect a debt|past.due (account|balance|payment)|outstanding debt|delinquent account)\b/i.test(text)) return "collection";
  if (/\b(press (one|1) to (be removed|remove|claim)|automated (sales|marketing) message|to be removed from (our|this) (calling|call) list)\b/i.test(text)) return "robocall";
  return null;
}

export function quickAnswer(raw: string) {
  const text = raw.toLowerCase();
  if (/\b(electrical|illuminated|lighted)\s+(sign|signs)\b/i.test(text))
    return "MTD does not offer electrical signs. Barry can review other non-electrical signage options with you.";
  if (/\b(on.site|at my (business|office|building)|on (the|my) building)\b.{0,50}\binstall/i.test(text)
    || /\binstall\b.{0,50}\b(on.site|building|at my (business|office))\b/i.test(text))
    return "MTD does not do on-site sign installation, but Barry may be able to help you find an installer and advise on the approach.";
  if (/\b(price|cost|estimate|quote|how much|rate)\b/i.test(text))
    return "Barry reviews project details and handles pricing personally.";
  if (/\b(logo|branding|identity)\b/i.test(text))
    return "MTD designs new logos and also refreshes existing logos to improve legibility and how they represent your business.";
  if (/\b(wrap|truck lettering|vehicle lettering|trailer graphics)\b/i.test(text))
    return "MTD offers commercial vehicle wraps, trailer graphics, and vehicle lettering.";
  if (/\b(banner|yard sign|coroplast|acm|aluminum composite|pvc|plastic sign)\b/i.test(text))
    return "Yes, MTD makes banners, yard signs, and flat-panel signs in several materials. Barry can confirm the details of your job.";
  return "";
}

function equalConstantTime(a: string, b: string) {
  let diff = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

export async function verifyTwilioForm(request: Request, authToken: string | undefined) {
  const signature = request.headers.get("x-twilio-signature");
  if (!authToken || !signature || !request.headers.get("content-type")?.toLowerCase().startsWith("application/x-www-form-urlencoded")) return null;
  const body = await request.text();
  if (body.length > 16000) return null;
  const form = new URLSearchParams(body);
  // Twilio signs the exact public webhook URL, then sorted form field/value pairs.
  const entries = [...form.entries()].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
  const payload = request.url + entries.map(([name, value]) => name + value).join("");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(authToken), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)));
  const expected = btoa(String.fromCharCode(...bytes));
  return equalConstantTime(signature, expected) ? form : null;
}

export async function sendOwnerSms(env: VoiceEnv, message: string) {
  const account = env.TWILIO_ACCOUNT_SID?.trim();
  const token = env.TWILIO_AUTH_TOKEN?.trim();
  const from = env.TWILIO_PHONE_NUMBER?.trim();
  const to = env.MTD_SMS_ALERT_TO?.trim();
  if (!account || !token || !looksLikePhone(from) || !looksLikePhone(to)) throw new Error("Twilio SMS settings are incomplete.");
  const body = new URLSearchParams({ To: to!, From: from!, Body: message });
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(account)}/Messages.json`, {
    method: "POST",
    headers: { authorization: `Basic ${btoa(`${account}:${token}`)}`, "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) throw new Error(`Twilio rejected the text alert (HTTP ${response.status}).`);
}

export function alertBody(name: string | null, caller: string | null, details: string | null) {
  const clean = (value: string | null, limit: number) => (value || "unknown").replace(/[\r\n\t]+/g, " ").trim().slice(0, limit);
  return `MTD missed-call lead. ${clean(name, 40)} (${clean(caller, 20)}): ${clean(details, 190)}`;
}
