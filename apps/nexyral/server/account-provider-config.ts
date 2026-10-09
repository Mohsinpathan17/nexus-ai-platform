import type { PreflightCheck } from "./deployment-preflight.ts";

const mailbox = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function accountProviderChecks(env: NodeJS.ProcessEnv): PreflightCheck[] {
  const required = env.NEXYRAL_REQUIRE_ACCOUNT_PROVIDERS === "1";
  const origins = (env.NEXYRAL_APP_ORIGINS ?? "").split(",").filter(Boolean);
  const origin = env.NEXYRAL_AUTH_ORIGIN ?? origins[0];
  const checks: PreflightCheck[] = [];
  function check(name: string, action: () => string) {
    try { checks.push({ name, passed: true, message: action() }); }
    catch (error) { checks.push({ name, passed: false, message: error instanceof Error ? error.message : "Configuration is invalid." }); }
  }
  function https(value: string | undefined) {
    try {
      const url = new URL(value ?? "");
      return url.protocol === "https:" && url.origin === value && !url.username && !url.password;
    } catch { return false; }
  }
  check("GitHub account configuration", () => {
    const id = env.NEXYRAL_GITHUB_CLIENT_ID, secret = env.NEXYRAL_GITHUB_CLIENT_SECRET;
    if (!id && !secret && !required) return "Disabled; no live GitHub sign-in configured.";
    if (!id?.trim() || !secret?.trim()) throw new Error("Set both NEXYRAL_GITHUB_CLIENT_ID and NEXYRAL_GITHUB_CLIENT_SECRET on the server.");
    let local = false;
    try {
      const url = new URL(origin ?? "");
      local = env.NODE_ENV !== "production" && url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname) && url.origin === origin;
    } catch { /* Invalid origins fail the check below. */ }
    if ((!https(origin) && !local) || !origins.includes(origin)) throw new Error("GitHub requires a canonical app origin in NEXYRAL_APP_ORIGINS; use HTTPS in production.");
    return "Configured; real GitHub authorization still needs an end-to-end check.";
  });
  check("Account email configuration", () => {
    const fields = ["NEXYRAL_SMTP_HOST", "NEXYRAL_SMTP_PORT", "NEXYRAL_SMTP_USER", "NEXYRAL_SMTP_PASSWORD", "NEXYRAL_MAIL_FROM"];
    if (!fields.some(name => env[name]) && !required) return "Disabled; verification/recovery email delivery is not configured.";
    if (!env.NEXYRAL_SMTP_HOST || !env.NEXYRAL_SMTP_USER?.trim() || !env.NEXYRAL_SMTP_PASSWORD?.trim() || !env.NEXYRAL_MAIL_FROM)
      throw new Error("Set SMTP host, username, password and NEXYRAL_MAIL_FROM on the server.");
    if (!/^[a-z0-9.-]+$/i.test(env.NEXYRAL_SMTP_HOST) || ![465, 587].includes(Number(env.NEXYRAL_SMTP_PORT ?? 587)) || !mailbox.test(env.NEXYRAL_MAIL_FROM))
      throw new Error("Use a SMTP hostname, TLS port465/587, and a valid sender email.");
    if (!https(origins[0])) throw new Error("Email links require a canonical HTTPS first application origin.");
    return "Configured; sender authorization and inbox delivery still need live checks.";
  });
  check("Support contact configuration", () => {
    if (!env.NEXYRAL_SUPPORT_EMAIL && !required) return "Disabled; no receiving support inbox configured.";
    if (!mailbox.test(env.NEXYRAL_SUPPORT_EMAIL ?? "")) throw new Error("Set NEXYRAL_SUPPORT_EMAIL to your actual receiving mailbox.");
    return "Configured; mailbox reception and MX records still need live checks.";
  });
  return checks;
}
