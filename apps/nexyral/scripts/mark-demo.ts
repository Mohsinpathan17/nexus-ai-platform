import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const index = await readFile("dist/index.html");
await writeFile("dist/demo-build.json", JSON.stringify({ publicDemo: true, indexSha256: createHash("sha256").update(index).digest("hex") }));
