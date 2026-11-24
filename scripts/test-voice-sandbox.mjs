import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { configureSandbox } from "./configure-voice-sandbox.mjs";
import { configureVoiceSecret } from "./configure-voice-secret.mjs";

const accountId = "a".repeat(32);
const dbId = "b".repeat(32);
const baseSite = { name: "mtd-signs-website", production_branch: "main", deployment_configs: { production: { d1_databases: { DB: { id: "live-id" } } } } };
function apiScenario({ existing = false, conflictingDb = false, badAuth = false } = {}) {
  const calls = [];
  let sandbox = existing ? { name: "mtd-voice-sandbox", production_branch: "main", deployment_configs: { production: { d1_databases: conflictingDb ? { DB: { id: "wrong-id" } } : {} } } } : null;
  const fetchImpl = async (url, args) => {
    const parsed = new URL(url);
    const path = parsed.pathname.split(`/accounts/${accountId}`)[1] + parsed.search;
    calls.push({ path, method: args.method, body: args.body ? JSON.parse(args.body) : null });
    if (badAuth) return { status: 401, ok: false, json: async () => ({ errors: [{ message: "Authentication error" }] }) };
    if (path === "/pages/projects/mtd-signs-website") return success(baseSite);
    if (path === "/d1/database?name=mtd-signs-preview-db") return success([{ name: "mtd-signs-preview-db", uuid: dbId }]);
    if (path === "/pages/projects/mtd-voice-sandbox" && args.method === "GET") return sandbox ? success(sandbox) : { status: 404, ok: false, json: async () => ({}) };
    if (path === "/pages/projects" && args.method === "POST") {
      sandbox = { ...JSON.parse(args.body), deployment_configs: { production: { d1_databases: {} } } };
      return success(sandbox);
    }
    if (path === "/pages/projects/mtd-voice-sandbox" && args.method === "PATCH") {
      sandbox.deployment_configs.production.d1_databases = JSON.parse(args.body).deployment_configs.production.d1_databases;
      return success(sandbox);
    }
    throw new Error(`Unexpected ${args.method} ${path}`);
  };
  return { fetchImpl, calls };
}
function success(result) { return { status: 200, ok: true, json: async () => ({ success: true, result }) }; }

for (const test of [
  { opts: {}, expected: ["POST", "PATCH"] },
  { opts: { existing: true }, expected: ["PATCH"] },
  { opts: { existing: true, conflictingDb: true }, failure: /unexpected D1/ },
  { opts: { badAuth: true }, failure: /401/ },
]) {
  const { fetchImpl, calls } = apiScenario(test.opts);
  if (test.failure) await assert.rejects(configureSandbox({ token: "fake", accountId, fetchImpl }), test.failure);
  else await configureSandbox({ token: "fake", accountId, fetchImpl });
  assert(!calls.some(c => c.path === "/pages/projects/mtd-signs-website" && c.method !== "GET"));
  if (test.expected) assert.deepEqual(calls.filter(c => c.method === "POST" || c.method === "PATCH").map(c => c.method), test.expected);
}

// Secret handoff updates only this separate project, and never logs or stores
// a token in the repository. A missing GitHub secret is an intentional no-op.
{
  const calls = [];
  const project = { name: "mtd-voice-sandbox", deployment_configs: {
    production: { d1_databases: { DB: { id: dbId } }, env_vars: {} },
  } };
  const fetchImpl = async (url, args) => {
    assert(url.endsWith("/pages/projects/mtd-voice-sandbox"));
    calls.push(args.method);
    if (args.method === "PATCH") {
      project.deployment_configs.production.env_vars = {
        TWILIO_AUTH_TOKEN: { type: "secret_text", value: "redacted" },
      };
      assert.equal(JSON.parse(args.body).deployment_configs.production.env_vars.TWILIO_AUTH_TOKEN.type, "secret_text");
    }
    return success(project);
  };
  assert.deepEqual(await configureVoiceSecret({ cloudflareToken: "cf", accountId, twilioToken: "", fetchImpl }), { configured: false });
  assert.deepEqual(calls, []);
  await assert.rejects(configureVoiceSecret({ cloudflareToken: "cf", accountId, twilioToken: "bad", fetchImpl }), /format/);
  assert.deepEqual(calls, []);
  assert.deepEqual(await configureVoiceSecret({ cloudflareToken: "cf", accountId, twilioToken: "f".repeat(32), fetchImpl }), { configured: true });
  assert.deepEqual(calls, ["GET", "PATCH", "GET"]);
}

// Ensure the packaged project has exactly one API route and no admin files.
const folder = await mkdtemp(join(tmpdir(), "mtd-voice-build-"));
try {
  for (const name of ["functions/api/voice.ts", "functions/lib/voice-receptionist.ts", "functions/lib/access.ts"]) {
    await mkdir(join(folder, name.split("/").slice(0, -1).join("/")), { recursive: true });
    await writeFile(join(folder, name), "test");
  }
  execFileSync(process.execPath, [join(process.cwd(), "scripts/build-voice-sandbox.mjs")], { cwd: folder });
  const routes = JSON.parse(await readFile(join(folder, ".voice-sandbox/dist/_routes.json"), "utf8"));
  assert.deepEqual(routes.include, ["/api/voice"]);
  await assert.rejects(readFile(join(folder, ".voice-sandbox/functions/api/admin/phone-inquiries.ts")), /ENOENT/);
} finally { await rm(folder, { recursive: true, force: true }); }
console.log("Voice sandbox packaging and API guard tests passed.");
