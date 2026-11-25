#!/usr/bin/env node
// Tests the public, signed Twilio webhook without creating a D1 inquiry.
// A signed form with an intentionally invalid CallSid must pass the signature
// gate and reach the 400 validation; an unsigned form must be rejected with 403.
import { createHmac } from "node:crypto";

export async function testDeployedVoice({ token, fetchImpl = fetch, url = "https://mtd-voice-sandbox.pages.dev/api/voice" }) {
  if (!/^[a-f0-9]{32}$/i.test(token || "")) throw new Error("Missing Twilio auth secret for phone smoke test.");
  const form = new URLSearchParams({ CallSid: "INVALID" });
  const body = form.toString();
  const headers = { "content-type": "application/x-www-form-urlencoded" };
  const unsigned = await fetchImpl(url, { method: "POST", headers, body, redirect: "manual" });
  if (unsigned.status !== 403) throw new Error(`Unsigned phone test not rejected as expected (HTTP ${unsigned.status}).`);
  const signature = createHmac("sha1", token).update(url + "CallSidINVALID").digest("base64");
  const signed = await fetchImpl(url, {
    method: "POST", headers: { ...headers, "x-twilio-signature": signature },
    body, redirect: "manual",
  });
  const responseText = await signed.text();
  if (signed.status !== 400 || responseText !== "Invalid call ID.") {
    throw new Error(`Signed phone test failed before call validation (HTTP ${signed.status}).`);
  }
  console.log("Public phone webhook passed unsigned-rejection and signed-authentication tests; no customer record created.");
}

if (process.argv[1] && new URL(`file://${process.argv[1]}`).href === import.meta.url) {
  testDeployedVoice({ token: process.env.TWILIO_AUTH_TOKEN })
    .catch(error => { console.error(error.message); process.exitCode = 1; });
}
