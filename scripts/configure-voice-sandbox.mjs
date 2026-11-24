#!/usr/bin/env node
// Creates/updates ONLY the isolated public phone-webhook test project.
// It reuses the already-migrated preview D1 database. The live MTD Pages
// project and its production settings are never modified.
export async function configureSandbox({ token, accountId, fetchImpl = fetch }) {
  if (!token) throw new Error("Missing CLOUDFLARE_API_TOKEN GitHub secret.");
  if (!/^[a-f0-9]{32}$/i.test(accountId || "")) throw new Error("Invalid Cloudflare account ID.");
  const base = `https://api.cloudflare.com/client/v4/accounts/${accountId}`;
  async function request(path, method = "GET", body, allow404 = false) {
    const response = await fetchImpl(base + path, {
      method,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (allow404 && response.status === 404) return null;
    const json = await response.json();
    if (!response.ok || json.success !== true) {
      const message = (json.errors || []).map(e => String(e.message).slice(0, 160)).join("; ");
      throw new Error(`Cloudflare ${method} ${path} failed (${response.status}): ${message || "unknown error"}`);
    }
    return json.result;
  }
  const siteBefore = await request("/pages/projects/mtd-signs-website");
  if (siteBefore.production_branch !== "main") throw new Error("Main site branch changed; aborting.");

  const databases = await request("/d1/database?name=mtd-signs-preview-db");
  const matches = databases.filter(db => db.name === "mtd-signs-preview-db");
  if (matches.length !== 1 || !matches[0].uuid) throw new Error("Isolated preview D1 not found uniquely.");
  const dbId = matches[0].uuid;

  const path = "/pages/projects/mtd-voice-sandbox";
  let project = await request(path, "GET", undefined, true);
  if (!project) {
    project = await request("/pages/projects", "POST", {
      name: "mtd-voice-sandbox",
      production_branch: "main",
    });
    console.log("Created separate mtd-voice-sandbox Pages project.");
  }
  if (project.name !== "mtd-voice-sandbox" || project.production_branch !== "main" || project.source?.type) {
    throw new Error("Sandbox project identity or source did not match. Refusing changes.");
  }
  const currentDb = project.deployment_configs?.production?.d1_databases?.DB?.id;
  if (currentDb && currentDb !== dbId) throw new Error("Sandbox is bound to unexpected D1; refusing replacement.");
  if (!currentDb) await request(path, "PATCH", {
    deployment_configs: { production: { d1_databases: { DB: { id: dbId } } } },
  });
  const verified = await request(path);
  if (verified.deployment_configs?.production?.d1_databases?.DB?.id !== dbId) {
    throw new Error("Sandbox D1 binding did not persist.");
  }
  const siteAfter = await request("/pages/projects/mtd-signs-website");
  if (JSON.stringify(siteBefore.deployment_configs?.production) !== JSON.stringify(siteAfter.deployment_configs?.production)) {
    throw new Error("Main site production settings unexpectedly changed; investigate immediately.");
  }
  console.log("Verified isolated sandbox D1 binding; live MTD production configuration unchanged.");
}

if (process.argv[1] && new URL(`file://${process.argv[1]}`).href === import.meta.url) {
  configureSandbox({ token: process.env.CLOUDFLARE_API_TOKEN, accountId: process.env.CLOUDFLARE_ACCOUNT_ID })
    .catch(error => { console.error(error.message); process.exitCode = 1; });
}
