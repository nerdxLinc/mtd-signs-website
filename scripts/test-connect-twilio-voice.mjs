#!/usr/bin/env node
import assert from "node:assert/strict";
import { connectTwilioVoice } from "./connect-twilio-voice.mjs";
const sid = "AC" + "a".repeat(32);
const token = "b".repeat(32);
const phoneSid = "PN" + "c".repeat(32);
const target = "https://mtd-voice-sandbox.pages.dev/api/voice";
const makeNumber = (overrides = {}) => ({
  sid: phoneSid, account_sid: sid, capabilities: { voice: true },
  voice_url: "https://demo.twilio.com/welcome/voice/", voice_method: "GET", voice_application_sid: null,
  ...overrides,
});
function scenario({ numbers = [makeNumber()], nextPage = null, listStatus = 200, updateStatus = 200, updateOverride = {} } = {}) {
  const calls = [];
  const fetchImpl = async (url, opts) => {
    calls.push({ url, method: opts.method, body: opts.body || null });
    if (opts.method === "GET") {
      return { ok: listStatus === 200, status: listStatus, json: async () => ({ incoming_phone_numbers: numbers, next_page_uri: nextPage }) };
    }
    assert.equal(opts.method, "POST");
    assert.equal(url, `https://api.twilio.com/2010-04-01/Accounts/${sid}/IncomingPhoneNumbers/${phoneSid}.json`);
    const params = new URLSearchParams(opts.body);
    assert.equal(params.get("VoiceUrl"), target);
    assert.equal(params.get("VoiceMethod"), "POST");
    return { ok: updateStatus === 200, status: updateStatus, json: async () => ({
      sid: phoneSid, voice_url: target, voice_method: "POST", ...updateOverride,
    }) };
  };
  return { calls, fetchImpl };
}
const cases = [
  { opts: {}, expected: { configured: true, alreadyConnected: false }, posts: 1 },
  { opts: { numbers: [] }, expected: { configured: false, reason: "number-count" }, posts: 0 },
  { opts: { numbers: [makeNumber(), makeNumber()] }, expected: { configured: false, reason: "number-count" }, posts: 0 },
  { opts: { nextPage: "/more" }, expected: { configured: false, reason: "number-count" }, posts: 0 },
  { opts: { numbers: [makeNumber({ capabilities: { voice: false } })] }, expected: { configured: false, reason: "eligibility" }, posts: 0 },
  { opts: { numbers: [makeNumber({ account_sid: "AC" + "d".repeat(32) })] }, expected: { configured: false, reason: "eligibility" }, posts: 0 },
  { opts: { numbers: [makeNumber({ voice_url: "https://example.com/existing" })] }, expected: { configured: false, reason: "custom-routing" }, posts: 0 },
  { opts: { numbers: [makeNumber({ voice_application_sid: "AP" + "e".repeat(32) })] }, expected: { configured: false, reason: "custom-routing" }, posts: 0 },
  { opts: { numbers: [makeNumber({ voice_url: target, voice_method: "POST" })] }, expected: { configured: true, alreadyConnected: true }, posts: 0 },
];
for (const entry of cases) {
  const { calls, fetchImpl } = scenario(entry.opts);
  assert.deepEqual(await connectTwilioVoice({ accountSid: sid, token, fetchImpl }), entry.expected);
  assert.equal(calls.filter(c => c.method === "POST").length, entry.posts);
}
for (const opts of [{ listStatus: 401 }, { updateStatus: 403 }, { updateOverride: { voice_url: "wrong" } }]) {
  const { fetchImpl } = scenario(opts);
  await assert.rejects(connectTwilioVoice({ accountSid: sid, token, fetchImpl }));
}
await assert.rejects(connectTwilioVoice({ accountSid: sid, token: "not-a-token", fetchImpl: scenario().fetchImpl }), /credentials/);
console.log("Guarded Twilio number routing tests passed.");
