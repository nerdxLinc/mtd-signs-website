import assert from "node:assert/strict";
import { configurePreview } from "./setup-preview-cloudflare.mjs";

const accountId = "a".repeat(32);
const token = "test-token";
const existingProduction = { d1_databases: { DB: { id: "live-db" } }, r2_buckets: { PORTFOLIO_BUCKET: { name: "live-images" } } };
const databaseId = "test-db-id";
const migrations = { "0008_assistant_rate_limits.sql": "CREATE TABLE IF NOT EXISTS assistant_rate_limits (key TEXT);", "0009_phone_inquiries.sql": "CREATE TABLE IF NOT EXISTS phone_inquiries (call_sid TEXT);" };

function fakeApi({ previewDbId, existingDb, badProject = false } = {}) {
  const calls = [];
  let boundDb = previewDbId;
  const fetchImpl = async (url, options) => {
    const parsedUrl = new URL(url);
    const path = parsedUrl.pathname.split(`/accounts/${accountId}`)[1] + parsedUrl.search;
    const method = options.method;
    const body = options.body ? JSON.parse(options.body) : null;
    calls.push({ path, method, body });
    let result;
    if (path === "/pages/projects/mtd-signs-website" && method === "GET") {
      result = { name: "mtd-signs-website", production_branch: badProject ? "feature" : "main", source: { config: { owner: "nerdxLinc", repo_name: "mtd-signs-website" } }, deployment_configs: { production: existingProduction, preview: { d1_databases: boundDb ? { DB: { id: boundDb } } : {} } } };
    } else if (path === "/d1/database?name=mtd-signs-preview-db" && method === "GET") {
      result = existingDb ? [{ name: "mtd-signs-preview-db", uuid: databaseId }] : [];
    } else if (path === "/d1/database" && method === "POST") {
      assert.deepEqual(body, { name: "mtd-signs-preview-db", jurisdiction: "us" });
      result = { uuid: databaseId };
    } else if (path === `/d1/database/${databaseId}/query` && method === "POST") {
      assert.ok(Object.values(migrations).includes(body.sql));
      result = [{ success: true }];
    } else if (path === "/pages/projects/mtd-signs-website" && method === "PATCH") {
      assert.equal(body.deployment_configs.production, undefined, "Production must never be patched");
      assert.deepEqual(body, { deployment_configs: { preview: { d1_databases: { DB: { id: databaseId } } } } });
      boundDb = databaseId;
      result = { name: "mtd-signs-website" };
    } else {
      throw new Error(`Unexpected Cloudflare call ${method} ${path}`);
    }
    return { ok: true, status: 200, json: async () => ({ success: true, result }) };
  };
  return { calls, fetchImpl };
}

const fresh = fakeApi();
await configurePreview({ accountId, token, fetchImpl: fresh.fetchImpl, sqlFiles: migrations, apply: true });
assert.equal(fresh.calls.filter((x) => x.method === "POST").length, 3);
assert.equal(fresh.calls.filter((x) => x.method === "PATCH").length, 1);

const repeat = fakeApi({ previewDbId: databaseId, existingDb: true });
await configurePreview({ accountId, token, fetchImpl: repeat.fetchImpl, sqlFiles: migrations, apply: true });
assert.equal(repeat.calls.filter((x) => x.method === "PATCH").length, 0);
assert.equal(repeat.calls.filter((x) => x.path === "/d1/database" && x.method === "POST").length, 0);

const wrongProject = fakeApi({ badProject: true });
await assert.rejects(configurePreview({ accountId, token, fetchImpl: wrongProject.fetchImpl, sqlFiles: migrations, apply: true }), /did not match/);
assert.deepEqual(wrongProject.calls.map((x) => x.method), ["GET"]);

const conflicting = fakeApi({ previewDbId: "other-db", existingDb: true });
await assert.rejects(configurePreview({ accountId, token, fetchImpl: conflicting.fetchImpl, sqlFiles: migrations, apply: true }), /different database/);
assert.equal(conflicting.calls.some((x) => x.method !== "GET"), false);

const noToken = fakeApi();
await assert.rejects(configurePreview({ accountId, token: "", fetchImpl: noToken.fetchImpl, sqlFiles: migrations, apply: true }), /Missing CLOUDFLARE_API_TOKEN/);
assert.equal(noToken.calls.length, 0);

console.log("Preview Cloudflare automation: 5 scenarios passed, no production mutations.");
