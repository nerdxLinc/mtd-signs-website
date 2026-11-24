import { type Env, json } from "../lib/access";
import { ASSISTANT_POLICY_VERSION, ASSISTANT_SYSTEM_PROMPT, mentionsUnapprovedPrice, SAFE_HANDOFF_REPLY, SAFE_QUOTE_REPLY } from "../lib/assistant-policy";

type ChatMessage = { role: "user" | "assistant"; content: string };
type AIResponse = { response?: string; choices?: Array<{ message?: { content?: string } }> };
type AssistantEnv = Env & {
  AI?: {
    run(model: string, input: { messages: Array<{ role: "system" | "user" | "assistant"; content: string }>; max_completion_tokens: number; temperature: number }): Promise<AIResponse>;
  };
};

const MODEL = "@cf/google/gemma-4-26b-a4b-it";
const HOURLY_REQUEST_LIMIT = 25;
const MAX_MESSAGES = 12;
const MAX_MESSAGE_LENGTH = 1000;

async function limitVisitor(request: Request, env: Env) {
  const address = request.headers.get("cf-connecting-ip") || "unknown";
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(address));
  const visitorHash = [...new Uint8Array(hash)].map((part) => part.toString(16).padStart(2, "0")).join("");
  const bucket = new Date().toISOString().slice(0, 13);

  await env.DB.prepare(`INSERT OR IGNORE INTO assistant_rate_limits (hour_bucket, visitor_hash, request_count) VALUES (?, ?, 0)`)
    .bind(bucket, visitorHash).run();
  const result = await env.DB.prepare(`
    UPDATE assistant_rate_limits
    SET request_count = request_count + 1
    WHERE hour_bucket = ? AND visitor_hash = ? AND request_count < ?
  `).bind(bucket, visitorHash, HOURLY_REQUEST_LIMIT).run();
  return result.meta.changes === 1;
}

export const onRequestPost: PagesFunction<AssistantEnv> = async ({ request, env }) => {
  // This is a same-origin endpoint; do not offer an unauthenticated cross-site AI proxy.
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return json({ error: "Invalid request origin." }, { status: 403 });
  }

  if (!env.AI) {
    return json({ error: "The virtual assistant has not been activated yet. Please use the project inquiry form." }, { status: 503 });
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 16000) return json({ error: "Message too long." }, { status: 413 });

  let messages: ChatMessage[];
  try {
    const payload = await request.json<{ messages?: unknown }>();
    if (!Array.isArray(payload.messages)) throw new Error("Missing messages");
    messages = payload.messages;
  } catch {
    return json({ error: "Invalid chat message." }, { status: 400 });
  }

  if (!messages.length || messages.length > MAX_MESSAGES || messages[messages.length - 1]?.role !== "user"
    || !messages.every((message) => message && (message.role === "user" || message.role === "assistant")
      && typeof message.content === "string" && message.content.trim().length > 0 && message.content.length <= MAX_MESSAGE_LENGTH)) {
    return json({ error: "Please send a shorter conversation." }, { status: 400 });
  }

  // Keep this a lead-intake assistant rather than an endless AI conversation.
  // After a few customer turns, refer the visitor directly to Barry.
  if (messages.filter((message) => message.role === "user").length >= 4) {
    return json({ reply: SAFE_HANDOFF_REPLY, policyVersion: ASSISTANT_POLICY_VERSION, handoff: true },
      { headers: { "cache-control": "no-store" } });
  }

  try {
    if (!await limitVisitor(request, env)) {
      return json({ error: "This chat has reached its hourly limit. Please send an inquiry or call MTD." }, { status: 429 });
    }

    const response = await env.AI.run(MODEL, {
      messages: [{ role: "system", content: ASSISTANT_SYSTEM_PROMPT }, ...messages],
      temperature: 0.3,
      max_completion_tokens: 240,
    });

    const reply = (response.response || response.choices?.[0]?.message?.content || "").trim();
    if (!reply) throw new Error("Model returned an empty reply");

    return json({
      reply: mentionsUnapprovedPrice(reply) ? SAFE_QUOTE_REPLY : reply.slice(0, 1500),
      policyVersion: ASSISTANT_POLICY_VERSION,
    }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("MTD assistant request failed", error);
    return json({ error: "Chat is temporarily unavailable. Please send an inquiry or call MTD." }, { status: 503 });
  }
};

export const onRequest: PagesFunction<AssistantEnv> = async (context) => {
  if (context.request.method === "POST") return onRequestPost(context);
  return json({ error: "Method not allowed." }, { status: 405, headers: { Allow: "POST" } });
};
