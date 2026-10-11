import { build, defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
function previewRuntime(): Plugin {
  let bundle: Promise<string> | undefined;
  return {
    name: "nexyral-isolated-runtime",
    resolveId(id) { if (id === "virtual:nexyral-preview-runtime") return "\0" + id; },
    async load(id) {
      if (id !== "\0virtual:nexyral-preview-runtime") return;
      bundle ??= build({ configFile: false, logLevel: "silent", define: { "process.env.NODE_ENV": JSON.stringify("production") }, build: { write: false, lib: { entry: "src/components/preview/runtime.tsx", name: "NexyralPreview", formats: ["iife"] }, minify: true } }).then(result => {
        const output = Array.isArray(result) ? result[0] : result;
        if (!("output" in output)) throw new Error("Preview runtime build failed");
        const chunk = output.output.find(item => item.type === "chunk");
        if (!chunk || chunk.type !== "chunk") throw new Error("Preview runtime is missing");
        return chunk.code;
      });
      return "export default " + JSON.stringify(await bundle);
    },
  };
}
const proxy = {
  "/api": {
    target: `http://127.0.0.1:${process.env.NEXYRAL_API_PORT ?? 8787}`,
    changeOrigin: false,
  },
};
export default defineConfig({
  plugins: [react(), tailwindcss(), previewRuntime()],
  server: { proxy },
  preview: { proxy },
});
