export function appOrigins() {
  return (process.env.NEXYRAL_APP_ORIGINS ?? "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173,http://localhost:8787,http://127.0.0.1:8787").split(",").map((origin) => {
    const url = new URL(origin.trim());
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error("Invalid application origin.");
    return url.origin;
  });
}
export function validatePreviewOrigin(origin: string, origins: string[], production = false) {
  const preview = new URL(origin);
  if (!["http:", "https:"].includes(preview.protocol) || preview.username || preview.password || preview.pathname !== "/" || preview.search || preview.hash || preview.origin !== origin) throw new Error("Configure a valid preview origin without a path.");
  if (origins.some((origin) => new URL(origin).hostname === preview.hostname)) throw new Error("Preview and application origins must use different hostnames, not just different ports.");
  if (production && (preview.protocol !== "https:" || origins.some((origin) => new URL(origin).protocol !== "https:"))) throw new Error("Production application and preview origins require HTTPS.");
  return preview.origin;
}
export function previewOrigin(origins: string[]) {
  return validatePreviewOrigin(process.env.NEXYRAL_PREVIEW_ORIGIN ?? "http://127.0.0.2:8788", origins, process.env.NODE_ENV === "production");
}
