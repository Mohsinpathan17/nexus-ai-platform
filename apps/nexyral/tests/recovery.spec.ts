import { test, expect } from "@playwright/test";
import type { AddressInfo } from "node:net";
import { openDatabase } from "../server/database.ts";
import { createApp } from "../server/app.ts";
import { issueRecovery } from "../server/password-recovery.ts";
test("owner completes recovery through the browser and signs in with new credentials", async ({ page }) => {
  const db = openDatabase(":memory:"); const origins: string[] = [];
  const server = createApp({ db, origins, staticDir: "dist" });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`; origins.push(origin);
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  try {
    await page.goto(origin + "/get-started");
    await page.getByLabel("Your name").fill("Recovery Owner");
    await page.getByLabel("Email", { exact: true }).fill("recovery@fixture.test");
    await page.getByLabel("Password", { exact: true }).fill("original-password-123");
    await page.getByRole("button", { name: "Create account", exact: true }).click();
    await expect(page.getByRole("button", { name: "New project", exact: true })).toBeVisible();
    const grant = issueRecovery(db, "recovery@fixture.test");
    await page.goto(origin + "/recover#token=" + grant.token);
    await expect(page.getByLabel("Recovery code")).toHaveValue(grant.token);
    await expect(page).toHaveURL(origin + "/recover");
    await page.getByLabel("New password", { exact: true }).fill("updated-password-456");
    await page.getByLabel("Confirm new password").fill("mismatched-password-789");
    await page.getByRole("button", { name: "Update password" }).click();
    await expect(page.getByRole("alert")).toContainText("do not match");
    await page.getByLabel("Confirm new password").fill("updated-password-456");
    await page.getByRole("button", { name: "Update password" }).click();
    await expect(page.getByRole("status")).toContainText("Previous sessions have been signed out");
    await page.getByRole("link", { name: /Sign in with your new password/ }).click();
    await page.getByLabel("Email", { exact: true }).fill("recovery@fixture.test");
    await page.getByLabel("Password", { exact: true }).fill("updated-password-456");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByRole("button", { name: "New project", exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); db.close(); }
});
