import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { FrontendPreview, PreviewAsset } from "../shared/preview.ts";
export const previewPolicy = "sandbox allow-scripts; default-src 'none'; script-src data:; style-src data: 'unsafe-inline'; img-src data:; font-src data:; connect-src 'none'; worker-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'";
export function validatePreview(value: unknown): FrontendPreview {
  if (!value || typeof value !== "object") throw new Error("Invalid preview");
  const preview = value as Record<string, unknown>;
  let size = 0;
  function assets(value: unknown, extension: string): PreviewAsset[] {
    if (!Array.isArray(value) || value.length > 4) throw new Error("Invalid preview assets");
    return value.map((value: unknown) => {
      if (!value || typeof value !== "object") throw new Error("Invalid asset");
      const asset = value as Record<string, unknown>;
      if (typeof asset.name !== "string" || !new RegExp(`^assets/[a-zA-Z0-9._-]+\\.${extension}$`).test(asset.name) || typeof asset.content !== "string") throw new Error("Invalid asset path");
      size += Buffer.byteLength(asset.content);
      if (size > 2000000) throw new Error("Preview exceeds size limit");
      return { name: asset.name, content: asset.content };
    });
  }
  const scripts = assets(preview.scripts, "js");
  const styles = assets(preview.styles, "css");
  if (scripts.length !== 1) throw new Error("Preview requires one bundled entry");
  return { scripts, styles };
}
export async function capturePreview(work: string): Promise<FrontendPreview> {
  const html = await readFile(resolve(work, "dist/index.html"), "utf8");
  async function assets(pattern: RegExp) {
    const names = [...html.matchAll(pattern)].map((match) => match[1]);
    return Promise.all(names.map(async (name) => {
      if (!/^assets\/[a-zA-Z0-9._-]+\.(js|css)$/.test(name)) throw new Error("Unsupported compiled asset");
      const content = await readFile(resolve(work, "dist", name), "utf8");
      return { name, content };
    }));
  }
  return validatePreview({ scripts: await assets(/src="\/(assets\/[^" ]+\.js)"/g), styles: await assets(/href="\/(assets\/[^" ]+\.css)"/g) });
}
export function previewHtml(preview: FrontendPreview, appOrigin?: string) {
  const uri = (type: string, content: string) => `data:${type};base64,${Buffer.from(content).toString("base64")}`;
  const ready = appOrigin ? `<script src="${uri("text/javascript", `window.addEventListener('load',()=>parent.postMessage({type:'nexyral.preview.ready'},${JSON.stringify(appOrigin)}))`)}"></script>` : "";
  return `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Generated frontend preview</title>${preview.styles.map((asset) => `<link rel="stylesheet" href="${uri("text/css", asset.content)}">`).join("")}</head><body><div id="root"></div>${preview.scripts.map((asset) => `<script type="module" src="${uri("text/javascript", asset.content)}"></script>`).join("")}${ready}</body></html>`;
}
