#!/usr/bin/env node
// Copy a GitHub Actions encrypted Twilio secret into the isolated Cloudflare
// Pages phone sandbox. Never echo the value, include it in a commit, or
// change the live MTD Pages project.
export async function configureVoiceSecret({ cloudflareToken, accountId, twilioToken, fetchImpl = fetch }) {
  if (!twilioToken) {
    console.log("TWILIO_AUTH_TOKEN not yet supplied; the public webhook will reject requests until configured.");
    return { configured: false };
  }
  if (!/^[a-f0-9]{32}$/i.test(twilioToken)) throw new Error("Twilio auth token format is invalid (value is not shown).");
  if (!cloudflareToken || !/^[a-f0-9]{32}$/i.test(accountId || "")) throw new Error("Cloudflare setup credentials unavailable.");
  const base = `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/mtd-voice-sandbox`;
  async function request(method = "GET", body) {
    const response = await fetchImpl(base, {
      method,
      headers: { Authorization: `Bearer ${cloudflareToken}`, "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const result = await response.json();
    if (!response.ok || result.success !== true) {
      // Never print Cloudflare's echoed request body; preserve only status.
      throw new Error(`Cloudflare sandbox secret ${method} failed with HTTP ${response.status}.`);
    }
    return result.result;
  }
  const before = await request();
  if (before.name !== "mtd-voice-sandbox" || !before.deployment_configs?.production?.d1_databases?.DB?.id) {
    throw new Error("Isolated phone project or Preview D1 binding missing; refusing secret update.");
  }
  const db = before.deployment_configs.production.d1_databases.DB.id;
  // Supply the existing D1 binding with the secret in the same update. Some
  // Pages API updates replace nested production settings rather than merge them.
  await request("PATCH", { deployment_configs: { production: {
    d1_databases: { DB: { id: db } },
    env_vars: { TWILIO_AUTH_TOKEN: { type: "secret_text", value: twilioToken } },
  } } });
  const after = await request();
  if (after.deployment_configs?.production?.d1_databases?.DB?.id !== db) {
    throw new Error("Sandbox D1 binding did not persist after adding the secret.");
  }
  if (after.deployment_configs?.production?.env_vars?.TWILIO_AUTH_TOKEN?.type !== "secret_text") {
    throw new Error("Sandbox secret was not confirmed as encrypted by Cloudflare.");
  }
  console.log("Verified encrypted Twilio authentication secret in isolated phone sandbox; D1 binding preserved.");
  return { configured: true };
}

if (process.argv[1] && new URL(`file://${process.argv[1]}`).href === import.meta.url) {
  configureVoiceSecret({
    cloudflareToken: process.env.CLOUDFLARE_API_TOKEN,
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    twilioToken: process.env.TWILIO_AUTH_TOKEN,
  }).catch(error => { console.error(error.message); process.exitCode = 1; });
}
