import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  cpSync,
  rmSync,
} from "node:fs";
import { resolve, join } from "node:path";
import { execFileSync } from "node:child_process";
const root = resolve(".");
const output = join(root, ".data", "focus-source");
rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
const manifest = JSON.parse(readFileSync("package.json", "utf8")) as {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
};
function put(path: string, text: string) {
  const target = join(output, path);
  mkdirSync(resolve(target, ".."), { recursive: true });
  writeFileSync(target, text);
}
for (const path of [
  "src/components/examples/FocusWorkspace.tsx",
  "src/hooks/useFocusTasks.ts",
  "src/styles/showcase.css",
  "src/styles/fonts.css",
]) {
  const target = join(output, path);
  mkdirSync(resolve(target, ".."), { recursive: true });
  cpSync(path, target);
}
mkdirSync(join(output, "public"), { recursive: true });
cpSync("public/fonts", join(output, "public/fonts"), { recursive: true });
put(
  "package.json",
  JSON.stringify(
    {
      name: "focus-nexyral-example",
      private: true,
      version: "1.0.0",
      type: "module",
      scripts: {
        dev: "vite",
        build: "tsc --noEmit && vite build",
        preview: "vite preview",
      },
      dependencies: Object.fromEntries(
        ["react", "react-dom", "lucide-react"].map((name) => [
          name,
          manifest.dependencies[name],
        ]),
      ),
      devDependencies: Object.fromEntries(
        [
          "vite",
          "@vitejs/plugin-react",
          "typescript",
          "@types/react",
          "@types/react-dom",
        ].map((name) => [name, manifest.devDependencies[name]]),
      ),
    },
    null,
    2,
  ),
);
put("src/vite-env.d.ts", '/// <reference types="vite/client" />\n');
put(
  "vite.config.ts",
  'import { defineConfig } from "vite";\nimport react from "@vitejs/plugin-react";\nexport default defineConfig({ plugins: [react()] });\n',
);
put(
  "tsconfig.json",
  JSON.stringify(
    {
      compilerOptions: {
        target: "ES2023",
        lib: ["ES2023", "DOM", "DOM.Iterable"],
        module: "ESNext",
        moduleResolution: "Bundler",
        jsx: "react-jsx",
        strict: true,
        skipLibCheck: true,
        noEmit: true,
        allowImportingTsExtensions: true,
      },
      include: ["src"],
    },
    null,
    2,
  ),
);
put(
  "index.html",
  '<!doctype html>\n<html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><meta name="description" content="Focus: a working task workspace built for NEXYRAL." /><title>Focus — NEXYRAL reference app</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>\n',
);
put(
  "src/main.tsx",
  `import React from 'react';
import { createRoot } from 'react-dom/client';
import FocusWorkspace from './components/examples/FocusWorkspace';
import './styles/base.css';
import './styles/fonts.css';
import './styles/showcase.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><main><div className="example-heading"><span>FOCUS / BUILT FOR NEXYRAL</span><h1>A little space to focus.</h1><p>A working reference app. Your tasks stay on this device.</p></div><FocusWorkspace /></main></React.StrictMode>);
`,
);
put(
  "src/styles/base.css",
  `:root {font-family: 'Manrope',Arial,sans-serif; color:var(--text); background:var(--bg); --font-copy:'Manrope',Arial,sans-serif; --font-display:'Space Grotesk',Arial,sans-serif; --bg:#f8f7f4; --surface:#fff; --surface-subtle:#f4f3f0; --text:#24232b; --muted:#676572; --border:#e2e0e7; --border-strong:#c8c5d0; --accent:#6251dc; --accent-soft:#eae6fc; --success:#287460; --button:#292434; --button-text:#fff; --shadow-elevated:0 24px 70px -42px #27232f45; color-scheme:light;}
@media(prefers-color-scheme:dark){:root{--bg:#0c0d11;--surface:#121319;--surface-subtle:#17181f;--text:#eeeef2;--muted:#aaa9b5;--border:#272830;--border-strong:#454550;--accent:#aaa0ff;--accent-soft:#26213d;--success:#81c4ad;--button:#e7e4f2;--button-text:#211a32;--shadow-elevated:0 24px 70px -35px #0009;color-scheme:dark;}}
*{box-sizing:border-box}body{margin:0;padding:clamp(20px,4vw,56px)}main{max-width:1160px;margin:auto}button,input,select{font:inherit}button{cursor:pointer}button:disabled{opacity:.6}p{margin:0}svg{flex:none}:focus-visible{outline:2px solid var(--accent);outline-offset:4px}.eyebrow{font:10px monospace;letter-spacing:.1em}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}.example-heading{margin-bottom:40px}.example-heading>span{font:11px monospace;color:var(--muted)}h1{font-family:var(--font-display);font-weight:500;font-size:clamp(36px,5vw,64px);letter-spacing:-.05em;margin:18px 0}.example-heading>p{font-size:18px;line-height:1.7;color:var(--muted)}
`,
);
put(
  "README.md",
  "# Focus — NEXYRAL reference app\n\nA real React + TypeScript task workspace: create tasks, set priority, complete, search, delete, save locally and export JSON. This is an interactive reference app, not a recorded autonomous AI build.\n\nRequires Node.js 24 or later.\n\n```sh\nnpm install\nnpm run dev\n```\n\nProduction check:\n\n```sh\nnpm run build\nnpm run preview\n```\n\nNo API keys, accounts, backend, or payments are needed. Browser data is local to the origin/device and is not uploaded. Font licenses are included in public/fonts.\n",
);
const zip = join(root, "public", "examples", "focus-source.zip");
mkdirSync(resolve(zip, ".."), { recursive: true });
execFileSync("python3", [
  "-c",
  'import pathlib,sys,zipfile\nroot=pathlib.Path(sys.argv[1])\nwith zipfile.ZipFile(sys.argv[2],"w",zipfile.ZIP_DEFLATED) as archive:\n for path in sorted(root.rglob("*")):\n  if path.is_file(): archive.write(path,path.relative_to(root))',
  output,
  zip,
]);
console.log("Packaged runnable Focus source:", zip);
