#!/usr/bin/env node
// Configures ONLY the MTD feature-preview D1 database and Pages binding.
// Requires a short-lived Cloudflare API token with account-scoped D1 Write
// and Cloudflare Pages Edit; never log or commit the token.
import { readFile } from "node:fs/promises";

const PROJECT = "mtd-signs-website";
const PREVIEW_DB = "mtd-signs-preview-db";
const EXPECTED_OWNER = "nerdxLinc";
const EXPECTED_REPO = "mtd-signs-website";
const MIGRATIONS = ["0008_assistant_rate_limits.sql", "0009_phone_inquiries.sql"];

export async function configurePreview({ accountId, token, fetchImpl = fetch, sqlFiles, apply = false }) {
  if (!/^[a-f\d]{32}$/i.test(accountId || "")) throw new Error("Missing or invalid Cloudflare account ID.");
  if (!token) throw new Error("Missing CLOUDFLARE_API_TOKEN repository secret. No changes made.");
  if (!apply) throw new Error("Refusing modifications without --apply.");

  const base = `https://api.cloudflare.com/client/v4/accounts/${accountId}`;
  async function request(path, method = "GET", data) {
    const response = await fetchImpl(`${base}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      ...(data === undefined ? {} : { body: JSON.stringify(data) }),
    });
    const result = await response.json();
    if (!response.ok || result.success !== true) {
      const messages = (result.errors || []).map((error) => String(error.message).slice(0, 200)).join("; ");
      throw new Error(`Cloudflare ${method} ${path.split("?")[0]} failed (${response.status}): ${messages || "unknown error"}`);
    }
    return result.result;
  }

  // Verify exact GitHub-connected project and production branch BEFORE any writes.
  const project = await request(`/pages/projects/${PROJECT}`);
  if (project.name !== PROJECT || project.production_branch !== "main"
      || project.source?.config?.owner !== EXPECTED_OWNER
      || project.source?.config?.repo_name !== EXPECTED_REPO) {
    throw new Error("Pages project/repository/production branch did not match. No changes made.");
  }
  const existingDbId = project.deployment_configs?.preview?.d1_databases?.DB?.id;

  const list = await request(`/d1/database?name=${encodeURIComponent(PREVIEW_DB)}`);
  const matches = list.filter((item) => item.name === PREVIEW_DB);
  if (matches.length > 1) throw new Error("Multiple preview databases matched; refusing ambiguous target.");
  let database = matches[0];
  if (existingDbId && database && existingDbId !== database.uuid) {
    throw new Error("Preview DB binding points to a different database; refusing to replace it.");
  }
  if (existingDbId && !database) {
    throw new Error("Preview DB binding already exists, but its database was not found; refusing changes.");
  }
  if (!database) {
    database = await request("/d1/database", "POST", { name: PREVIEW_DB, jurisdiction: "us" });
    if (!database?.uuid) throw new Error("D1 creation returned no database ID.");
    console.log(`Created isolated preview database: ${PREVIEW_DB}`);
  } else {
    console.log(`Using existing isolated preview database: ${PREVIEW_DB}`);
  }

  for (const migration of MIGRATIONS) {
    const sql = sqlFiles[migration];
    if (!sql) throw new Error(`Missing migration file: ${migration}`);
    const runs = await request(`/d1/database/${database.uuid}/query`, "POST", { sql });
    if (!Array.isArray(runs) || runs.some((item) => item.success === false)) {
      throw new Error(`D1 migration returned a failure: ${migration}`);
    }
    console.log(`Applied to preview only: ${migration}`);
  }

  if (!existingDbId) {
    // Omit production entirely; do not modify production deployment configuration.
    await request(`/pages/projects/${PROJECT}`, "PATCH", {
      deployment_configs: { preview: { d1_databases: { DB: { id: database.uuid } } } },
    });
  }
  const verified = await request(`/pages/projects/${PROJECT}`);
  if (verified.deployment_configs?.preview?.d1_databases?.DB?.id !== database.uuid) {
    throw new Error("Preview binding did not persist. Check Pages settings.");
  }
  if (JSON.stringify(verified.deployment_configs?.production) !== JSON.stringify(project.deployment_configs?.production)) {
    throw new Error("WARNING: Production configuration changed unexpectedly. Stop and investigate.");
  }
  console.log("Verified: Preview DB binding is correct, Production configuration unchanged.");
  console.log("Next: redeploy the feature branch, then configure Twilio Preview secrets.");
}

if (process.argv[1] && new URL(`file://${process.argv[1]}`).href === import.meta.url) {
  try {
    const sqlFiles = Object.fromEntries(await Promise.all(MIGRATIONS.map(async (name) => [
      name, await readFile(new URL(`../migrations/${name}`, import.meta.url), "utf8"),
    ])));
    await configurePreview({
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
      token: process.env.CLOUDFLARE_API_TOKEN,
      sqlFiles,
      apply: process.argv.includes("--apply"),
    });
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Unknown setup error.");
    process.exitCode = 1;
  }
}
