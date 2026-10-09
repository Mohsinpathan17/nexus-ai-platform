import { test } from "node:test";
import assert from "node:assert/strict";
import { validatePreview, previewHtml } from "./preview.ts";
import { sourceArchive } from "./archive.ts";
test("preview packaging rejects traversal, missing entries and oversized content", () => {
  assert.throws(() => validatePreview({ scripts: [{ name: "../../secret.js", content: "" }], styles: [] }));
  assert.throws(() => validatePreview({ scripts: [], styles: [] }));
  assert.throws(() => validatePreview({ scripts: [{ name: "assets/app.js", content: "a".repeat(2000001) }], styles: [] }));
  const html = previewHtml(validatePreview({ scripts: [{ name: "assets/app.js", content: '</script><script>untrusted</script>' }], styles: [] }));
  assert.doesNotMatch(html, /untrusted/);
  assert.throws(() => sourceArchive({ "../outside": "text" }));
  assert.throws(() => sourceArchive({ "/absolute": "text" }));
});
