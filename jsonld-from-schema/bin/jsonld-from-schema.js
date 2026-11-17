#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const distCli = join(here, "..", "dist", "cli.js");
const srcCli = join(here, "..", "src", "cli.ts");

async function main() {
  if (existsSync(distCli)) {
    await import(pathToFileURL(distCli).href);
    return;
  }
  // Dev fallback via tsx if dist is missing
  const { register } = await import("node:module");
  try {
    const { pathToFileURL: p2u } = await import("node:url");
    register("tsx/esm", p2u("./"));
  } catch {
    // ignore
  }
  await import(pathToFileURL(srcCli).href);
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
