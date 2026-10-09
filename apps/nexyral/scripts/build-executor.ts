import { spawn, execFileSync } from "node:child_process";
import { lookup } from "node:dns/promises";
import { resolve } from "node:path";
import { copyFile, readFile, mkdir, writeFile } from "node:fs/promises";
const clientConfig = resolve(".data/docker-client");
await mkdir(clientConfig, { recursive: true, mode: 0o700 });
const context = resolve(".data/executor-image-context");
await mkdir(context, { recursive: true, mode: 0o700 });
await copyFile("docker/executor/Dockerfile", resolve(context, "Dockerfile"));
const certificates = await readFile("/etc/ssl/certs/ca-certificates.crt", "utf8");
if (!certificates.includes("-----BEGIN CERTIFICATE-----") || certificates.includes("PRIVATE KEY")) throw new Error("The build requires a trusted public CA bundle.");
await writeFile(resolve(context, "build-ca.crt"), certificates, { mode: 0o600 });
const proxyNames = ["HTTP_PROXY", "HTTPS_PROXY", "NO_PROXY", "http_proxy", "https_proxy", "no_proxy"];
const proxyValues = proxyNames.map((name) => process.env[name]).filter((value): value is string => Boolean(value));
// Docker's daemon may not share the workspace's proxy hostname resolution.
// Carry the resolved address into build-only /etc/hosts without changing trust.
const proxyHosts = new Set(proxyNames.filter((name) => !name.toLowerCase().includes("no_proxy") && process.env[name]).map((name) => new URL(process.env[name]!).hostname));
const proxyHostArgs: string[] = [];
for (const host of proxyHosts) {
  const { address } = await lookup(host, { family: 4 });
  proxyHostArgs.push("--add-host", `${host}:${address}`);
}
const tag = "nexyral-executor:node24-browser-v1";
const code = await new Promise<number>((done, reject) => {
  const child = spawn("docker", ["--config", clientConfig, "build", "--pull=false", "--network=host", ...proxyHostArgs, "--tag", tag, ...proxyNames.flatMap((name) => process.env[name] ? ["--build-arg", name] : []), context], { stdio: ["ignore", "pipe", "pipe"] });
  const report = (chunk: Buffer) => { let text = chunk.toString(); for (const value of proxyValues) text = text.split(value).join("<configured proxy>"); process.stdout.write(text); };
  child.stdout.on("data", report); child.stderr.on("data", report);
  child.on("error", reject); child.on("close", (code) => done(code ?? 1));
});
if (code !== 0) process.exit(code);
const details = JSON.parse(execFileSync("docker", ["image", "inspect", tag], { encoding: "utf8" })) as { Id: string; Config: { Labels: Record<string, string> } }[];
const image = details[0];
if (!/^sha256:[a-f0-9]{64}$/.test(image.Id) || image.Config.Labels["org.nexyral.executor.bundled-browser"] !== "true") throw new Error("Invalid execution image metadata.");
execFileSync("docker", ["run", "--rm", "--network", "none", "--read-only", "--cap-drop", "ALL", "--security-opt", "no-new-privileges", "--pids-limit", "32", "--memory", "128m", image.Id, "/usr/lib/chromium/chromium", "--version"], { timeout: 15000, stdio: "pipe" });
await mkdir(".data", { recursive: true, mode: 0o700 });
await writeFile(".data/execution-image.json", JSON.stringify({ image: image.Id, bundledBrowser: true, version: 1 }, null, 2), { mode: 0o600 });
console.log("Execution image built and recorded by immutable local image ID. No worker started.");
