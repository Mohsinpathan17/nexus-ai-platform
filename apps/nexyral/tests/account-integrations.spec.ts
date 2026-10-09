import { test, expect } from "@playwright/test";
import type { AddressInfo } from "node:net";
import { openDatabase } from "../server/database.ts";
import { createApp } from "../server/app.ts";
for (const theme of ["dark", "light"] as const) for (const width of [375, 1440]) {
  test(`email and GitHub account flow ${theme} ${width}`, async ({ page }) => {
    const db = openDatabase(":memory:"), origins = ["http://127.0.0.1:0"];
    const github = { appOrigin: origins[0], clientId: "fixture-client", clientSecret: "fixture-secret" };
    const messages: string[] = [];
    const email = `accounts-${theme}-${width}@fixture.test`;
    const mail = { origin: origins[0], send: async (_to: string, _subject: string, text: string) => { messages.push(text); } };
    const server = createApp({ db, origins, staticDir: "dist", github, mail, githubExchange: async () => ({ id: "100", name: "Account Owner", email }) });
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`; origins[0] = origin; github.appOrigin = origin; mail.origin = origin;
    const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
    try {
      // Keep this deterministic provider fixture on loopback: Playwright does not
      // route subsequent requests in every browser navigation redirect chain.
      await page.route("**/api/auth/github/start", async route => {
        const response = await route.fetch({ maxRedirects: 0 });
        const state = new URL(response.headers().location).searchParams.get("state");
        await route.fulfill({ response, headers: { ...response.headers(), location: `${origin}/api/auth/github/callback?state=${state}&code=fixture-code` } });
      });
      await page.route("https://github.com/login/oauth/authorize**", async route => {
        const state = new URL(route.request().url()).searchParams.get("state");
        await route.fulfill({ status: 302, headers: { Location: `${origin}/api/auth/github/callback?state=${state}&code=fixture-code` } });
      });
      await page.setViewportSize({ width, height: 950 }); await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(origin + "/get-started"); await page.selectOption("select", theme);
      await expect(page.getByRole("link", { name: "Continue with GitHub", exact: true })).toBeVisible();
      await page.getByLabel("Your name").fill("Account Owner");
      await page.getByLabel("Email", { exact: true }).fill(email);
      await page.getByLabel("Password", { exact: true }).fill("a-long-browser-account-password");
      await page.getByRole("button", { name: "Create account", exact: true }).click();
      await expect(page.getByText("Verify your email before creating or modifying project data.", { exact: true })).toBeVisible();
      expect(messages).toHaveLength(1);
      const verification = messages[0].match(/token=([a-f0-9]{64})/)![1];
      await page.goto(origin + "/verify-email#token=" + verification);
      await expect(page).toHaveURL(origin + "/verify-email");
      await page.getByRole("button", { name: "Verify email", exact: true }).click();
      await expect(page.getByRole("status")).toContainText("Email verified");
      await page.getByRole("link", { name: "Open workspace →", exact: true }).click();
      await expect(page.getByText("Email verified.", { exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Connect GitHub", exact: true }).click();
      await expect(page.getByText("GitHub sign-in is connected.", { exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: `artifacts/accounts-${width}-${theme}.png`, fullPage: true });
      await page.getByRole("button", { name: "Sign out", exact: true }).click();
      await page.getByRole("link", { name: "Continue with GitHub", exact: true }).click();
      await expect(page).toHaveURL(origin + "/workspace");
      await expect(page.getByText("GitHub sign-in is connected.", { exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Sign out", exact: true }).click();
      await page.goto(origin + "/recover");
      await page.getByLabel("Account email", { exact: true }).fill(email);
      await page.getByRole("button", { name: "Send recovery email", exact: true }).click();
      await expect(page.getByRole("status")).toContainText("If your account exists");
      const recovery = messages.at(-1)!.match(/token=([a-f0-9]{64})/)![1];
      await page.goto(origin + "/recover#token=" + recovery);
      await page.getByLabel("New password", { exact: true }).fill("a-new-browser-account-password");
      await page.getByLabel("Confirm new password", { exact: true }).fill("a-new-browser-account-password");
      await page.getByRole("button", { name: "Update password", exact: true }).click();
      await expect(page.getByRole("status")).toContainText("Previous sessions have been signed out");
      expect(errors).toEqual([]);
    } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); db.close(); }
  });
}
