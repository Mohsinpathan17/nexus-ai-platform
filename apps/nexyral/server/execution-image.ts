import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
const legacy = "node:24.19.0-slim@sha256:a9f5f7c91a432850b2a8a7797adf5eadb6c733ceed61167806cee7ea7fbc29df";
export function executionImage() {
  const override = process.env.NEXYRAL_EXECUTION_IMAGE;
  if (override) {
    if (!/^sha256:[a-f0-9]{64}$/.test(override)) throw new Error("NEXYRAL_EXECUTION_IMAGE must be an immutable local image ID.");
    return { image: override, bundledBrowser: true };
  }
  const path = resolve(".data/execution-image.json");
  if (!existsSync(path)) return { image: legacy, bundledBrowser: false };
  const config = JSON.parse(readFileSync(path, "utf8")) as { image: string; version: number; bundledBrowser: boolean };
  if (!/^sha256:[a-f0-9]{64}$/.test(config.image) || config.version !== 1 || config.bundledBrowser !== true) throw new Error("Invalid execution image descriptor. Rebuild with npm run build:executor.");
  return { image: config.image, bundledBrowser: true };
}
