#!/usr/bin/env node
// Read-only Twilio inventory check for the trial account. Does not reveal the
// auth token, full phone number, or pre-existing routing URLs in public CI logs.
export async function inspectTwilioNumbers({ accountSid, token, fetchImpl = fetch }) {
  if (!/^AC[a-f0-9]{32}$/i.test(accountSid || "") || !/^[a-f0-9]{32}$/i.test(token || "")) {
    throw new Error("Missing Twilio account credentials for number inspection.");
  }
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json?PageSize=2`;
  const credentials = Buffer.from(`${accountSid}:${token}`).toString("base64");
  const response = await fetchImpl(url, {
    headers: { Authorization: `Basic ${credentials}`, Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Twilio phone-number inventory API returned HTTP ${response.status}.`);
  const result = await response.json();
  if (!Array.isArray(result.incoming_phone_numbers)) throw new Error("Unexpected Twilio inventory response.");
  const numbers = result.incoming_phone_numbers;
  const hasMore = !!result.next_page_uri;
  console.log(`Twilio-owned incoming numbers: ${numbers.length}${hasMore ? "+" : ""}.`);
  for (const number of numbers) {
    const lastFour = String(number.phone_number || "").slice(-4).replace(/[^0-9]/g, "");
    const voice = number.capabilities?.voice === true;
    const route = String(number.voice_url || "").trim();
    const ours = route === "https://mtd-voice-sandbox.pages.dev/api/voice";
    const twilioDefault = !route || /^https:\/\/demo\.twilio\.com\/welcome\/voice\/?(?:\?.*)?$/i.test(route);
    console.log(`Twilio number ending ${lastFour || "unknown"}: voice=${voice}; inbound route=${ours ? "MTD sandbox" : twilioDefault ? "blank or Twilio default" : "existing custom route"}.`);
  }
  return { count: numbers.length, hasMore };
}

if (process.argv[1] && new URL(`file://${process.argv[1]}`).href === import.meta.url) {
  inspectTwilioNumbers({ accountSid: process.env.TWILIO_ACCOUNT_SID, token: process.env.TWILIO_AUTH_TOKEN })
    .catch(error => { console.error(error.message); process.exitCode = 1; });
}
