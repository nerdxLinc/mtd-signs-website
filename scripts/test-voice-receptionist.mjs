import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { build } from "esbuild";

const temp = await mkdtemp(join(tmpdir(), "mtd-voice-test-"));
const db = new DatabaseSync(":memory:");
db.exec(await readFile("migrations/0009_phone_inquiries.sql", "utf8"));
const smsAlerts = [];
let smsFail = false;
let checks = 0;

const d1 = {
  prepare(sql) {
    const prepared = db.prepare(sql);
    let args = [];
    return {
      bind(...values) { args = values; return this; },
      async run() { const result = prepared.run(...args); return { meta: { changes: result.changes } }; },
      async first() { return prepared.get(...args) || null; },
      async all() { return { results: prepared.all(...args) }; },
    };
  },
};

try {
  const out = join(temp, "voice.mjs");
  await build({ entryPoints: ["functions/api/voice.ts"], outfile: out, format: "esm", platform: "neutral", bundle: true, logLevel: "silent" });
  const { onRequestPost } = await import(pathToFileURL(out).href);
  const env = {
    DB: d1,
    TWILIO_ACCOUNT_SID: "AC" + "1".repeat(32),
    TWILIO_AUTH_TOKEN: "test-dummy-not-a-real-secret",
    TWILIO_PHONE_NUMBER: "+15015550002",
    MTD_SMS_ALERT_TO: "+15015550003",
  };

  globalThis.fetch = async (_url, init) => {
    const args = new URLSearchParams(init.body);
    smsAlerts.push(args.get("Body"));
    return new Response(smsFail ? "no" : '{"sid":"SMtest"}', { status: smsFail ? 502 : 201 });
  };

  function makeCallId(n) { return `CA${n.toString(16).padStart(32, "0")}`; }
  function signedRequest(step, params, sign = true) {
    const url = `https://www.mtdsigns.com/api/voice${step ? `?step=${step}` : ""}`;
    const body = new URLSearchParams(params);
    const sorted = [...body.entries()].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
    const payload = url + sorted.map(([name, value]) => name + value).join("");
    const signature = createHmac("sha1", env.TWILIO_AUTH_TOKEN).update(payload).digest("base64");
    return new Request(url, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", "X-Twilio-Signature": sign ? signature : "bad-signature" }, body: body.toString() });
  }
  async function invoke(step, params, sign = true) {
    const response = await onRequestPost({ request: signedRequest(step, params, sign), env });
    return { response, text: await response.text() };
  }
  const caller = "+15015550004";
  const id1 = makeCallId(1);
  let r = await invoke("", { CallSid: id1, From: caller, To: env.TWILIO_PHONE_NUMBER }, false);
  assert.equal(r.response.status, 403); checks++;
  r = await invoke("", { CallSid: id1, From: caller, To: env.TWILIO_PHONE_NUMBER });
  assert.match(r.text, /automated assistant/); checks++;
  r = await invoke("reason", { CallSid: id1, SpeechResult: "How much for a new logo?" });
  assert.match(r.text, /Barry reviews project details/); checks++;
  r = await invoke("name", { CallSid: id1, SpeechResult: "Alice" });
  assert.match(r.text, /saved for Barry/); checks++;
  assert.equal(db.prepare("SELECT status FROM phone_inquiries WHERE call_sid=?").get(id1).status, "new"); checks++;
  assert.equal(smsAlerts.length, 1); checks++;
  assert.match(smsAlerts[0], /Alice.*new logo/); checks++;
  await invoke("name", { CallSid: id1, SpeechResult: "Alice" });
  assert.equal(smsAlerts.length, 1, "Twilio retries must not create multiple SMS alerts"); checks++;

  const id2 = makeCallId(2);
  await invoke("", { CallSid: id2, From: caller });
  r = await invoke("reason", { CallSid: id2, SpeechResult: "We can get you more customers with SEO services." });
  assert.match(r.text, /vendor proposals/); checks++;
  assert.equal(db.prepare("SELECT intent FROM phone_inquiries WHERE call_sid=?").get(id2).intent, "solicitation"); checks++;
  assert.equal(smsAlerts.length, 1); checks++;

  const id3 = makeCallId(3);
  await invoke("", { CallSid: id3, From: caller });
  await invoke("reason", { CallSid: id3, SpeechResult: "I am calling from a debt collection agency about an overdue account." });
  assert.equal(db.prepare("SELECT status FROM phone_inquiries WHERE call_sid=?").get(id3).status, "collection"); checks++;
  assert.equal(smsAlerts.length, 1); checks++;

  const id7 = makeCallId(7);
  await invoke("", { CallSid: id7, From: caller });
  await invoke("reason", { CallSid: id7, SpeechResult: "I need a logo for my debt collection agency." });
  assert.equal(db.prepare("SELECT intent FROM phone_inquiries WHERE call_sid=?").get(id7).intent, "project"); checks++;

  const id4 = makeCallId(4);
  await invoke("", { CallSid: id4, From: "anonymous" });
  await invoke("reason", { CallSid: id4, Digits: "1" });
  r = await invoke("name", { CallSid: id4, SpeechResult: "Bob" });
  assert.match(r.text, /ten digit callback/); checks++;
  r = await invoke("phone", { CallSid: id4, Digits: "5015550005" });
  assert.match(r.text, /saved for Barry/); checks++;
  assert.match(smsAlerts.at(-1), /Bob.*\+15015550005/); checks++;

  const id5 = makeCallId(5);
  await invoke("", { CallSid: id5, From: caller });
  r = await invoke("reason", { CallSid: id5 });
  assert.match(r.text, /didn&apos;t hear your request/); checks++;
  r = await invoke("retry", { CallSid: id5 });
  assert.match(r.text, /Please try calling again/); checks++;
  assert.equal(db.prepare("SELECT status FROM phone_inquiries WHERE call_sid=?").get(id5).status, "in_progress"); checks++;

  const id6 = makeCallId(6);
  smsFail = true;
  await invoke("", { CallSid: id6, From: caller });
  await invoke("reason", { CallSid: id6, SpeechResult: "I need a yard sign" });
  r = await invoke("name", { CallSid: id6, SpeechResult: "Carol" });
  assert.match(r.text, /saved for Barry/); checks++;
  assert.equal(db.prepare("SELECT alert_sent FROM phone_inquiries WHERE call_sid=?").get(id6).alert_sent, -1); checks++;
  assert.equal(db.prepare("SELECT status FROM phone_inquiries WHERE call_sid=?").get(id6).status, "new"); checks++;

  console.log(`Voice receptionist tests passed (${checks} checks).`);
} finally {
  db.close();
  await rm(temp, { recursive: true, force: true });
}
