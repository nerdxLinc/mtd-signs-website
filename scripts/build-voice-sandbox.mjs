#!/usr/bin/env node
// Package only the public voice webhook for an isolated Cloudflare Pages project.
// Do not copy site UI, private admin routes, or deployment secrets.
import { copyFile, mkdir, writeFile, access } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const sandbox = join(root, ".voice-sandbox");
try {
  await access(sandbox);
  throw new Error("Sandbox build directory already exists; refusing to overwrite it.");
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}
await mkdir(join(sandbox, "functions", "api"), { recursive: true });
await mkdir(join(sandbox, "functions", "lib"), { recursive: true });
await mkdir(join(sandbox, "dist"), { recursive: true });

for (const file of [
  "functions/api/voice.ts",
  "functions/lib/voice-receptionist.ts",
  "functions/lib/access.ts",
]) {
  await copyFile(join(root, file), join(sandbox, file));
}

await writeFile(join(sandbox, "dist", "index.html"),
  '<!doctype html><html lang="en"><meta charset="utf-8"><title>MTD phone test</title><p>Private development endpoint. Please visit <a href="https://www.mtdsigns.com">MTD Signs &amp; Graphics</a>.</p></html>\n');
await writeFile(join(sandbox, "dist", "_routes.json"),
  JSON.stringify({ version: 1, include: ["/api/voice"], exclude: [] }, null, 2) + "\n");
console.log("Prepared isolated voice webhook package; no admin or website routes included.");
