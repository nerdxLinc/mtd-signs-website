import { type Env, json } from "../lib/access";

type ContactPayload = {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  projectDetails?: unknown;
  language?: unknown;
  website?: unknown;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

async function ensureContactTable(env: Env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS contact_submissions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      project_details TEXT,
      language TEXT NOT NULL DEFAULT 'en',
      status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'archived')),
      notification_sent INTEGER NOT NULL DEFAULT 0,
      notification_error TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: ContactPayload;
  try {
    body = await request.json<ContactPayload>();
  } catch {
    return json({ error: "Please check the form and try again." }, { status: 400 });
  }

  // Quiet honeypot: bots receive a normal response without creating an inquiry.
  if (clean(body.website, 200)) {
    return json({ received: true }, { status: 201 });
  }

  const name = clean(body.name, 120);
  const email = clean(body.email, 254).toLowerCase();
  const phone = clean(body.phone, 50);
  const projectDetails = clean(body.projectDetails, 5000);
  const language = body.language === "es" ? "es" : "en";

  if (!name || !EMAIL_PATTERN.test(email)) {
    return json({ error: "A name and valid email address are required." }, { status: 400 });
  }

  try {
    await ensureContactTable(env);
    const id = crypto.randomUUID();
    await env.DB.prepare(`
      INSERT INTO contact_submissions
        (id, name, email, phone, project_details, language, status)
      VALUES (?, ?, ?, ?, ?, ?, 'new')
    `).bind(id, name, email, phone || null, projectDetails || null, language).run();

    let notificationSent = false;
    let notificationError: string | null = null;
    try {
      if (!env.EMAIL) throw new Error("Cloudflare Email Service binding EMAIL is not configured.");
      await env.EMAIL.send({
        to: "mtdsigns@gmail.com",
        from: { email: "website@mtdsigns.com", name: "MTD Signs Website" },
        replyTo: { email, name },
        subject: `New website inquiry from ${name}`,
        text: [
          "A new project inquiry was submitted at mtdsigns.com.",
          "",
          `Name: ${name}`,
          `Email: ${email}`,
          `Phone: ${phone || "Not provided"}`,
          `Language: ${language === "es" ? "Spanish" : "English"}`,
          "",
          "Project details:",
          projectDetails || "Not provided",
          "",
          "The inquiry is also saved in the private MTD Admin inbox.",
        ].join("\n"),
      });
      notificationSent = true;
    } catch (error) {
      notificationError = error instanceof Error ? error.message.slice(0, 1000) : "Email notification failed.";
      console.error("Contact inquiry notification could not be sent", error);
    }

    try {
      await env.DB.prepare(`
        UPDATE contact_submissions
        SET notification_sent = ?, notification_error = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(notificationSent ? 1 : 0, notificationError, id).run();
    } catch (error) {
      // The durable inquiry is already saved. Never turn a notification-audit
      // update into a false failure for the visitor.
      console.error("Contact notification audit could not be updated", error);
    }

    return json({ received: true, inquiryId: id }, { status: 201 });
  } catch (error) {
    console.error("Contact inquiry could not be stored", error);
    return json(
      { error: "Your message could not be received right now. Please call 501.329.1111 or try again." },
      { status: 503 },
    );
  }
};

export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method === "POST") return onRequestPost(context);
  return json({ error: "Method not allowed." }, { status: 405, headers: { Allow: "POST" } });
};
