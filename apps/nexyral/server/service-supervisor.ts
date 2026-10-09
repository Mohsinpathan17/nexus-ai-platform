import { spawn, type ChildProcess } from "node:child_process";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
export interface ServiceCommand { name: string; args: string[]; readyUrl?: string; readyHost?: string }
export function superviseServices(commands: ServiceCommand[], options: { startupMs?: number; graceMs?: number } = {}) {
  if (!commands.length) throw new Error("At least one service is required.");
  const children: ChildProcess[] = [];
  const closed = new Set<ChildProcess>();
  let stopping = false; let ready = false; let exitCode = 0;
  let escalation: ReturnType<typeof setTimeout> | undefined;
  let resolveDone!: (code: number) => void;
  const done = new Promise<number>(resolve => { resolveDone = resolve; });
  const controller = new AbortController();
  function signal(child: ChildProcess, force = false) {
    if (closed.has(child) || !child.pid) return;
    try {
      // Every group is created by this supervisor; never signal an unrelated PID.
      if (process.platform !== "win32") process.kill(-child.pid, force ? "SIGKILL" : "SIGTERM");
      else child.kill(force ? "SIGKILL" : "SIGTERM");
    } catch { /* A concurrent exit is already handled by close. */ }
  }
  function stop(code = 0) {
    if (stopping) return;
    stopping = true; exitCode = code; controller.abort();
    children.forEach(child => signal(child));
    escalation = setTimeout(() => children.forEach(child => signal(child, true)), options.graceMs ?? 5000);
    escalation.unref();
  }
  for (const command of commands) {
    const child = spawn(process.execPath, command.args, { stdio: "inherit", detached: process.platform !== "win32" });
    children.push(child);
    child.on("error", () => stop(1));
    child.on("close", () => {
      closed.add(child);
      if (!stopping) { console.error(`${command.name} exited; stopping companion services.`); stop(1); }
      if (closed.size === children.length) { clearTimeout(escalation); resolveDone(exitCode); }
    });
  }
  const readiness = (async () => {
    const deadline = Date.now() + (options.startupMs ?? 30_000);
    const pending = new Set(commands.filter(command => command.readyUrl));
    while (!stopping && Date.now() < deadline) {
      for (const command of pending) {
        try {
          const url = new URL(command.readyUrl!);
          const request = url.protocol === "https:" ? httpsRequest : httpRequest;
          const healthy = await new Promise<boolean>((resolve, reject) => {
            const probe = request(url, {
              headers: command.readyHost ? { Host: command.readyHost } : undefined,
              signal: AbortSignal.any([controller.signal, AbortSignal.timeout(1000)]),
            }, response => {
              response.resume();
              resolve(response.statusCode !== undefined && response.statusCode >= 200 && response.statusCode < 300);
            });
            probe.on("error", reject);
            probe.end();
          });
          if (healthy) pending.delete(command);
        } catch { /* Retry within the bounded startup deadline. */ }
      }
      if (stopping) break;
      if (!pending.size) { ready = true; return; }
      await new Promise(resolve => setTimeout(resolve, 150));
    }
    if (!ready) { stop(1); throw new Error("Services did not become ready. Companion processes were stopped."); }
  })();
  // Prevent an unhandled rejection while callers attach their own readiness handler.
  void readiness.catch(() => {});
  return { ready: readiness, done, stop };
}
