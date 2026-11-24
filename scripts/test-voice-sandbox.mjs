import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { configureSandbox } from "./configure-voice-sandbox.mjs";

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
