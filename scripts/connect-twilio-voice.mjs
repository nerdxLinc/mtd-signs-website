#!/usr/bin/env node
// Connect exactly one unused/default Twilio trial number to the isolated MTD
// phone sandbox. Never purchase, release, change SMS settings, or touch Verizon.
// The account SID and auth token must come from GitHub encrypted secrets.
const TARGET = "https://mtd-voice-sandbox.pages.dev/api/voice";
const DEFAULT_VOICE = /^https:\/\/demo\.twilio\.com\/welcome\/voice\/?(?:\?.*)?$/i;

export async function connectTwilioVoice({ accountSid, token, fetchImpl = fetch }) {
  if (!/^AC[a-f0-9]{32}$/i.test(accountSid || "") || !/^[a-f0-9]{32}$/i.test(token || "")) {
    throw new Error("Missing Twilio credentials; no number routing changed.");
  }
  const base = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers`;
  const authorization = "Basic " + Buffer.from(`${accountSid}:${token}`).toString("base64");
  const list = await fetchImpl(`${base}.json?PageSize=2`, {
    method: "GET", headers: { Authorization: authorization, Accept: "application/json" },
  });
  if (!list.ok) throw new Error(`Twilio number listing failed (HTTP ${list.status}).`);
  const data = await list.json();
  if (!Array.isArray(data.incoming_phone_numbers)) throw new Error("Unexpected Twilio number list.");
  if (data.incoming_phone_numbers.length !== 1 || data.next_page_uri) {
    console.log("Twilio routing left unchanged: account does not have exactly one assigned number.");
    return { configured: false, reason: "number-count" };
  }
  const n = data.incoming_phone_numbers[0];
  if (!/^PN[a-f0-9]{32}$/i.test(n.sid || "") || n.account_sid?.toLowerCase() !== accountSid.toLowerCase() ||
      n.capabilities?.voice !== true) {
    console.log("Twilio routing left unchanged: number ownership or voice capability not confirmed.");
    return { configured: false, reason: "eligibility" };
  }
  const existing = String(n.voice_url || "").trim();
  const method = String(n.voice_method || "POST").toUpperCase();
  if (existing === TARGET && method === "POST") {
    console.log("Twilio inbound voice already routes to MTD's isolated phone test endpoint.");
    return { configured: true, alreadyConnected: true };
  }
  // A phone number connected to a TwiML app can have an empty voice URL.
  // Do not take it over without explicitly reviewing that app.
  if (n.voice_application_sid || (existing && existing !== TARGET && !DEFAULT_VOICE.test(existing))) {
    console.log("Twilio routing left unchanged: an existing custom voice handler is configured.");
    return { configured: false, reason: "custom-routing" };
  }
  const body = new URLSearchParams({ VoiceUrl: TARGET, VoiceMethod: "POST" });
  const updated = await fetchImpl(`${base}/${n.sid}.json`, {
    method: "POST",
    headers: { Authorization: authorization, "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!updated.ok) throw new Error(`Twilio rejected safe voice routing change (HTTP ${updated.status}).`);
  const result = await updated.json();
  if (result.sid !== n.sid || result.voice_url !== TARGET || String(result.voice_method).toUpperCase() !== "POST") {
    throw new Error("Twilio did not confirm expected voice URL and POST method.");
  }
  console.log("Twilio default/unused trial number now routes calls to the isolated MTD phone webhook; SMS settings unchanged.");
  return { configured: true, alreadyConnected: false };
}

if (process.argv[1] && new URL(`file://${process.argv[1]}`).href === import.meta.url) {
  connectTwilioVoice({ accountSid: process.env.TWILIO_ACCOUNT_SID, token: process.env.TWILIO_AUTH_TOKEN })
    .catch(error => { console.error(error.message); process.exitCode = 1; });
}
