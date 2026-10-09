import { mkdtemp, mkdir, readdir, copyFile, rm, writeFile, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
const root = await mkdtemp(join(tmpdir(), "nexyral-package-"));
const destination = join(root, "nexyral");
const directories = ["src", "server", "shared", "scripts", "public", "deploy", "docker", "docs", "tests"];
const files = ["package.json", "package-lock.json", "index.html", "vite.config.ts", "tsconfig.json", "tsconfig.app.json", "tsconfig.node.json", "tsconfig.server.json", ".node-version", ".oxlintrc.json", ".gitignore", "README.md", "playwright.config.ts"];
async function copyDirectory(source: string, target: string) {
  await mkdir(target, { recursive: true });
  for (const item of await readdir(source, { withFileTypes: true })) {
    if (item.isSymbolicLink()) throw new Error("Deployment source must not contain symlinks.");
    if (item.name.startsWith(".") || /\.(pem|key|sqlite|log)$/.test(item.name)) throw new Error("Unexpected private file in source directory.");
    if (item.isDirectory()) await copyDirectory(join(source, item.name), join(target, item.name));
    else if (item.isFile()) await copyFile(join(source, item.name), join(target, item.name));
    else throw new Error("Unexpected source file type.");
  }
}
try {
  await mkdir(destination);
  for (const directory of directories) await copyDirectory(directory, join(destination, directory));
  for (const file of files) await copyFile(file, join(destination, file));
  await mkdir("artifacts", { recursive: true });
  const archive = resolve("artifacts/nexyral-backend-source.tar.gz");
  execFileSync("tar", ["-czf", archive, "-C", root, "nexyral"]);
  const sha256 = createHash("sha256").update(await readFile(archive)).digest("hex");
  await writeFile(archive + ".sha256", `${sha256}  nexyral-backend-source.tar.gz\n`);
  console.log("Backend source package created from explicit allowlisted source directories. No database, credentials, model, dependency cache or execution outputs included.");
} finally { await rm(root, { recursive: true, force: true }); }
