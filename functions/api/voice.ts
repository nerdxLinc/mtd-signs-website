import { type VoiceEnv, alertBody, classifyNoncustomerCall, listen, looksLikePhone, quickAnswer, say, sendOwnerSms, twiml, verifyTwilioForm } from "../lib/voice-receptionist";

// Twilio Programmable Voice webhook. Configure the Twilio number's incoming
// Voice URL to POST https://www.mtdsigns.com/api/voice (never the redirecting
// apex domain). Caller speech is transcribed by Twilio Gather; no recording is
// requested or stored by this application.

const CALL_SID = /^CA[0-9a-fA-F]{32}$/;
const MAX_TRANSCRIPT = 800;

function spoken(form: URLSearchParams) {
  return (form.get("SpeechResult") ?? "").replace(/[\r\n\t]+/g, " ").trim().slice(0, MAX_TRANSCRIPT);
}

function unavailable() {
  return twiml(say("Sorry, our automated receptionist is temporarily unavailable. Please try again or send an inquiry through M T D signs dot com.") + "<Hangup/>");
}

async function finalize(env: VoiceEnv, callSid: string, name: string, phone: string | null) {
  const row = await env.DB.prepare("SELECT caller_number, project_details FROM phone_inquiries WHERE call_sid = ?")
    .bind(callSid).first<{ caller_number: string | null; project_details: string | null }>();
  if (!row) throw new Error("Phone inquiry not found.");
  const caller = phone || row.caller_number;
  await env.DB.prepare(`
    UPDATE phone_inquiries
    SET customer_name = ?, caller_number = ?, intent = 'project', status = 'new', updated_at = CURRENT_TIMESTAMP
    WHERE call_sid = ? AND status = 'in_progress'
  `).bind(name || null, caller, callSid).run();

  // At most one alert attempt for each call; duplicate Twilio webhook retries
  // should never send multiple SMS notifications. The admin inbox retains a
  // saved inquiry even if Twilio SMS is unavailable.
  const claimed = await env.DB.prepare("UPDATE phone_inquiries SET alert_sent = 2 WHERE call_sid = ? AND status = 'new' AND alert_sent = 0")
    .bind(callSid).run();
  if (claimed.meta.changes === 1) {
    try {
      await sendOwnerSms(env, alertBody(name || null, caller, row.project_details));
      await env.DB.prepare("UPDATE phone_inquiries SET alert_sent = 1, alert_error = NULL WHERE call_sid = ?")
        .bind(callSid).run();
    } catch (error) {
      // Keep the inquiry in the Access-protected admin inbox for manual review.
      const note = error instanceof Error ? error.message.slice(0, 250) : "Text notification failed.";
      await env.DB.prepare("UPDATE phone_inquiries SET alert_sent = -1, alert_error = ? WHERE call_sid = ?")
        .bind(note, callSid).run();
      console.error("MTD phone lead saved but alert failed", callSid, note);
    }
  }
  return twiml(say("Thanks. Your message has been saved for Barry to review. Goodbye.") + "<Hangup/>");
}

export const onRequestPost: PagesFunction<VoiceEnv> = async ({ request, env }) => {
  let form: URLSearchParams | null;
  try {
    form = await verifyTwilioForm(request, env.TWILIO_AUTH_TOKEN);
  } catch {
    return new Response("Invalid phone service request.", { status: 403 });
  }
  if (!form) return new Response("Invalid phone service signature.", { status: 403 });

  const callSid = form.get("CallSid") || "";
  if (!CALL_SID.test(callSid)) return new Response("Invalid call ID.", { status: 400 });

  const step = new URL(request.url).searchParams.get("step") || "start";
  try {
    if (step === "start") {
      const from = form.get("From");
      await env.DB.prepare(`
        INSERT OR IGNORE INTO phone_inquiries (call_sid, caller_number)
        VALUES (?, ?)
      `).bind(callSid, looksLikePhone(from) ? from : null).run();
      const greeting = "Thanks for calling M T D Signs and Graphics. I'm the automated assistant. Barry couldn't answer right now. Please briefly tell me what signs, graphics, or design work you need. Or press 1 if you'd rather just request a callback.";
      return twiml(listen(request, "reason", greeting));
    }

    if (step === "reason" || step === "retry") {
      const reason = spoken(form);
      const callbackOnly = form.get("Digits") === "1";
      if (!reason && !callbackOnly) {
        if (step === "reason") return twiml(listen(request, "retry", "Sorry, I didn't hear your request. Please tell me what you're calling about, or press 1 to request a callback."));
        return twiml(say("Sorry we couldn't get your message. Please try calling again or use the project inquiry form on our website.") + "<Hangup/>");
      }

      const projectDetails = callbackOnly ? "Requested a callback without project details." : reason;
      const excluded = callbackOnly ? null : classifyNoncustomerCall(reason);
      await env.DB.prepare(`
        UPDATE phone_inquiries
        SET project_details = ?, intent = ?, status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE call_sid = ? AND status = 'in_progress'
      `).bind(projectDetails, excluded || "project", excluded || "in_progress", callSid).run();

      if (excluded) {
        const response = excluded === "solicitation"
          ? "This number is for customer project inquiries. Please send vendor proposals through the general contact form on our website. Goodbye."
          : "Thank you for calling. Your message has been noted. Goodbye.";
        return twiml(say(response) + "<Hangup/>");
      }

      const helpfulReply = callbackOnly ? "" : quickAnswer(reason);
      const question = `${helpfulReply ? helpfulReply + " " : ""}May I have your name for Barry's callback?`;
      return twiml(listen(request, "name", question));
    }

    if (step === "name") {
      const name = spoken(form).slice(0, 100);
      const record = await env.DB.prepare("SELECT caller_number FROM phone_inquiries WHERE call_sid = ?")
        .bind(callSid).first<{ caller_number: string | null }>();
      if (!record) return unavailable();
      if (!looksLikePhone(record.caller_number)) {
        await env.DB.prepare("UPDATE phone_inquiries SET customer_name = ?, updated_at = CURRENT_TIMESTAMP WHERE call_sid = ?")
          .bind(name || null, callSid).run();
        const action = new URL(request.url);
        action.search = "?step=phone";
        const xmlAction = action.toString().replace(/&/g, "&amp;");
        return twiml(`<Gather input="dtmf" numDigits="10" timeout="9" method="POST" actionOnEmptyResult="true" action="${xmlAction}">`
          + say("Your caller number didn't come through. Please enter your ten digit callback number on the keypad.") + "</Gather>");
      }
      return await finalize(env, callSid, name, null);
    }

    if (step === "phone") {
      const digits = form.get("Digits") || "";
      const phone = /^[2-9]\d{9}$/.test(digits) ? `+1${digits}` : null;
      const existing = await env.DB.prepare("SELECT customer_name FROM phone_inquiries WHERE call_sid = ?")
        .bind(callSid).first<{ customer_name: string | null }>();
      return await finalize(env, callSid, existing?.customer_name || "", phone);
    }
    return new Response("Unknown call step.", { status: 400 });
  } catch (error) {
    console.error("MTD phone receptionist failed", callSid, error instanceof Error ? error.message : "unknown error");
    return unavailable();
  }
};

export const onRequest: PagesFunction<VoiceEnv> = async (context) => {
  if (context.request.method === "POST") return onRequestPost(context);
  return new Response("Method not allowed.", { status: 405, headers: { Allow: "POST" } });
};
