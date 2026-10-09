import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import type { AddressInfo } from "node:net";
const password = "a-long-test-account-password";
for (const theme of ["dark", "light"] as const) {
  test(`authenticated workspace ${theme}: create project, record intent, live events, cancel and sign out`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    const email = `browser-${theme}-${Date.now()}@example.test`;
    await page.goto("/get-started");
    await page.selectOption("select", theme);
    await page.getByLabel("Your name").fill("Engineering Owner");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page
      .getByRole("button", { name: "Create account", exact: true })
      .click();
    await expect(page).toHaveURL(/\/workspace$/);
    await expect(
      page.getByRole("heading", { name: "Your first project starts here." }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "New project", exact: true })
      .click();
    await page.getByLabel("Project name").fill("SupportOS");
    await page
      .getByRole("button", { name: "Create project", exact: true })
      .click();
    await page.getByRole("link", { name: /SupportOS/ }).click();
    await page
      .getByLabel("What do you want to build?")
      .fill(
        "Build a support inbox with accessible ticket assignment and a typed reporting API.",
      );
    await page.getByRole("button", { name: "Create engineering run" }).click();
    await expect(page).toHaveURL(/\/workspace\/runs\//);
    await expect(
      page.getByText("Awaiting executor", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Intent, recorded." }),
    ).toBeVisible();
    await expect(
      page.getByText("STREAM CONNECTED", { exact: true }),
    ).toBeVisible();
    await expect(page.locator(".live-event-list")).toContainText(
      "executor.unavailable",
    );
    await expect(page.locator(".stored-artifact pre")).toContainText(
      "accessible ticket assignment",
    );
    await expect(page.getByText("NOT STARTED", { exact: true })).toHaveCount(5);
    mkdirSync("artifacts", { recursive: true });
    await page.screenshot({
      path: `artifacts/workspace-desktop-${theme}.png`,
      fullPage: true,
    });
    for (const width of [375, 390, 430, 768]) {
      await page.setViewportSize({ width, height: 844 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(
      page.getByRole("button", { name: "Cancel run" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `artifacts/workspace-mobile-${theme}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "Cancel run" }).click();
    await expect(page.getByText("Cancelled", { exact: true })).toBeVisible();
    await expect(page.locator(".live-event-list")).toContainText(
      "run.cancelled",
    );
    await page.reload();
    await expect(page.getByText("Cancelled", { exact: true })).toBeVisible();
    await expect(page.locator(".stored-artifact pre")).toContainText(
      "accessible ticket assignment",
    );
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto("/workspace");
    await expect(page).toHaveURL(/\/login$/);
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/workspace$/);
    await expect(page.getByRole("link", { name: /SupportOS/ })).toBeVisible();
    expect(errors).toEqual([]);
  });
}
test("workspace protects direct links and failed login is understandable", async ({
  page,
}) => {
  await page.goto("/workspace/runs/not-owned");
  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("heading", { name: "Welcome back." }),
  ).toBeVisible();
  await page
    .getByLabel("Email", { exact: true })
    .fill("no-account@example.test");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "Email or password is incorrect.",
  );
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeEnabled();
});

test("planning worker updates the live workspace with a reviewable artifact", async ({ page }) => {
  const { openDatabase } = await import("../server/database.ts");
  const { createWorker } = await import("../server/worker.ts");
  const { createApp } = await import("../server/app.ts");
  const db = openDatabase(":memory:");
  const origins: string[] = [];
  const server = createApp({ db, origins, staticDir: "dist" });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  origins.push(origin);
  const worker = createWorker(db, async () => ({
    summary: "Fixture proposal for browser integration testing",
    requirements: ["Persist owner-scoped tickets"],
    architecture: ["Typed ticket API with session authorization"],
    acceptanceCriteria: ["An owner can assign a ticket"],
    risks: ["This fixture is not real model inference"],
  }));
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    await page.goto(`${origin}/get-started`);
    await page.getByLabel("Your name").fill("Plan Reviewer");
    await page.getByLabel("Email", { exact: true }).fill(`planner-${Date.now()}@example.test`);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Create account", exact: true }).click();
    await page.getByRole("button", { name: "New project", exact: true }).click();
    await page.getByLabel("Project name").fill("Planning fixture");
    await page.getByRole("button", { name: "Create project", exact: true }).click();
    await page.getByRole("link", { name: /Planning fixture/ }).click();
    await page.getByLabel("What do you want to build?").fill("Build a ticket assignment system with session authorization.");
    await page.getByRole("button", { name: "Create engineering run" }).click();
    await expect(page.getByText("STREAM CONNECTED", { exact: true })).toBeVisible();
    await worker.tick();
    await expect(page.getByText("Awaiting approval", { exact: true })).toBeVisible();
    await expect(page.locator(".stored-artifact")).toHaveCount(2);
    await expect(page.locator(".live-event-list")).toContainText("plan.ready");
    await expect(page.getByText("MODEL PROPOSAL", { exact: true })).toBeVisible();
    for (const theme of ["dark", "light"]) {
      await page.selectOption("select", theme);
      for (const width of [375, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      }
      await page.screenshot({ path: `artifacts/planning-${theme}.png`, fullPage: true });
    }
    await page.reload();
    await expect(page.getByText("Awaiting approval", { exact: true })).toBeVisible();
    await page.getByRole("textbox", { name: "Review reason", exact: true }).fill("This proposal requires unsupported backend services");
    await page.getByRole("button", { name: "Reject proposal and end run" }).click();
    await expect(page.getByText("Cancelled", { exact: true })).toBeVisible();
    await expect(page.locator(".live-event-list")).toContainText("plan.rejected");
    expect(errors).toEqual([]);
  } finally {
    await worker.stop();
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    db.close();
  }
});

test("owner reviews a plan, explicitly approves, and receives actual isolated frontend check evidence", async ({ page }) => {
  test.setTimeout(120000);
  const { openDatabase } = await import("../server/database.ts");
  const { createApp } = await import("../server/app.ts");
  const { createWorker } = await import("../server/worker.ts");
  const { verifyFrontend } = await import("../server/build.ts");
  const db = openDatabase(":memory:");
  const origins: string[] = [];
  const { createPreviewServer } = await import("../server/preview-server.ts");
  const previewOptions = { db, origins, previewOrigin: "http://127.0.0.2:0" };
  const previewServer = createPreviewServer(previewOptions);
  const previewCookies: string[] = [];
  previewServer.on("request", (request) => { if (request.url?.startsWith("/view/")) previewCookies.push(request.headers.cookie ?? ""); });
  await new Promise<void>((resolve) => previewServer.listen(0, "127.0.0.2", resolve));
  previewOptions.previewOrigin = `http://127.0.0.2:${(previewServer.address() as AddressInfo).port}`;
  const server = createApp({ db, origins, staticDir: "dist", previewOrigin: previewOptions.previewOrigin });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`; origins.push(origin);
  const worker = createWorker(db, async () => ({
    summary: "Controlled fixture proposal for a counter frontend", requirements: ["Increment a local counter"],
    architecture: ["React with local state"], acceptanceCriteria: ["The button updates the count"], risks: ["No backend or deployment"],
  }), async (_, approved, signal) => verifyFrontend({ app: 'import React from "react"; export default function App(){const [count,setCount]=React.useState(0);return <main><h1>Counter</h1><button onClick={()=>setCount(count+1)}>Count {count}</button></main>;}', css: 'body { font-family: system-ui; }' }, signal, undefined, approved.behaviorChecks ?? []));
  const errors: string[] = []; page.on("pageerror", (error) => errors.push(error.message));
  try {
    await page.goto(`${origin}/get-started`);
    await page.getByLabel("Your name").fill("Build Owner");
    await page.getByLabel("Email", { exact: true }).fill(`builder-${Date.now()}@example.test`);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Create account", exact: true }).click();
    await page.getByRole("button", { name: "New project", exact: true }).click();
    await page.getByLabel("Project name").fill("Counter frontend");
    await page.getByRole("button", { name: "Create project", exact: true }).click();
    await page.getByRole("link", { name: /Counter frontend/ }).click();
    await page.getByLabel("What do you want to build?").fill("Create a local counter frontend with an increment button.");
    await page.getByRole("button", { name: "Create engineering run" }).click();
    await expect(page.getByText("STREAM CONNECTED", { exact: true })).toBeVisible();
    await worker.tick();
    await expect(page.getByRole("heading", { name: "Review before execution." })).toBeVisible();
    const approve = page.getByRole("button", { name: "Approve frontend build" });
    await expect(approve).toBeDisabled();
    for (const theme of ["light", "dark"]) {
      await page.selectOption("select", theme);
      for (const width of [375, 390, 430, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      }
      await page.waitForTimeout(350);
      await page.screenshot({ path: `artifacts/plan-review-${theme}.png`, fullPage: true });
    }
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Revise proposal", exact: true }).click();
    await page.getByRole("textbox", { name: "Summary", exact: true }).fill("Owner revised counter frontend");
    await page.getByRole("button", { name: "Add behavior check", exact: true }).click();
    await page.getByRole("textbox", { name: "Check name", exact: true }).fill("Counter updates");
    await page.getByRole("combobox", { name: "Action", exact: true }).selectOption("click");
    await page.getByRole("textbox", { name: "Accessible name", exact: true }).fill("Count 0");
    await page.getByRole("button", { name: "Add step", exact: true }).click();
    await page.getByRole("textbox", { name: "Expected text", exact: true }).fill("Count 1");
    for (const width of [375, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.screenshot({ path: "artifacts/behavior-editor.png", fullPage: true });
    await page.getByRole("textbox", { name: "Review reason", exact: true }).fill("Clarify the frontend scope and test the counter");
    await page.getByRole("button", { name: "Save new revision" }).click();
    await expect(page.locator(".live-event-list")).toContainText("plan.revised");
    await expect(page.getByRole("checkbox")).not.toBeChecked();
    await expect(approve).toBeDisabled();
    await expect(page.locator(".plan-review")).toContainText("Owner revised counter frontend");
    await page.getByRole("checkbox").check();
    await expect(approve).toBeEnabled();
    await approve.click();
    await expect(page.locator(".live-event-list")).toContainText("plan.approved");
    await worker.tick();
    await expect(page.getByText("Succeeded", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Selected checks passed." })).toBeVisible();
    await expect(page.getByText("ACTUAL CHECK OUTPUT", { exact: true })).toBeVisible();
    await expect(page.locator(".stored-artifact")).toHaveCount(7);
    await expect(page.locator(".live-event-list")).toContainText("build.completed");
    await page.getByRole("button", { name: "Open verified preview" }).click();
    const generated = page.frameLocator('iframe[title="Generated frontend preview"]');
    await expect(generated.getByRole("heading", { name: "Counter", exact: true })).toBeVisible();
    await generated.getByRole("button", { name: "Count 0", exact: true }).click();
    await expect(generated.getByRole("button", { name: "Count 1", exact: true })).toBeVisible();
    const previewFrame = page.frames().find((frame) => frame.url().includes("/view/"))!;
    expect(new URL(previewFrame.url()).hostname).not.toBe(new URL(origin).hostname);
    await expect(page.getByText("Preview frame ready", { exact: true })).toBeVisible();
    expect(previewCookies.every((cookie) => cookie === "")).toBe(true);
    const isolated = await previewFrame.evaluate(async (appOrigin) => {
      const blocked = (operation: () => unknown) => { try { operation(); return false; } catch { return true; } };
      let apiBlocked = false;
      try { await fetch(appOrigin + "/api/auth/session"); } catch { apiBlocked = true; }
      return { parent: blocked(() => parent.document.body), cookie: blocked(() => document.cookie), storage: blocked(() => localStorage.getItem("probe")), api: apiBlocked };
    }, origin);
    expect(isolated).toEqual({ parent: true, cookie: true, storage: true, api: true });
    for (const theme of ["light", "dark"]) {
      await page.selectOption("select", theme);
      for (const width of [375, 390, 430, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      }
      await page.screenshot({ path: `artifacts/retained-preview-${theme}.png`, fullPage: true });
    }
    await page.getByRole("button", { name: "Reset preview", exact: true }).click();
    await expect(generated.getByRole("button", { name: "Count 0", exact: true })).toBeVisible();
    const archivePromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download source archive", exact: true }).click();
    const archive = await archivePromise;
    expect(archive.suggestedFilename()).toMatch(/^nexyral-.*\.tar$/);
    await archive.saveAs("artifacts/retained-source.tar");
    expect(execFileSync("tar", ["-xOf", "artifacts/retained-source.tar", "src/App.tsx"], { encoding: "utf8" })).toContain("setCount(count+1)");
    const retainedEvidence = JSON.parse(execFileSync("tar", ["-xOf", "artifacts/retained-source.tar", "nexyral/verification.json"], { encoding: "utf8" }));
    expect(retainedEvidence.behavior.status).toBe("passed");
    expect(retainedEvidence.previewSha256).toMatch(/^[a-f0-9]{64}$/);
    const downloadPromise = page.waitForEvent("download");
    await page.locator(".stored-artifact").filter({ hasText: "frontend-source.json" }).getByRole("button", { name: "Download artifact" }).click();
    expect((await downloadPromise).suggestedFilename()).toBe("frontend-source.json");
    await page.reload();
    await expect(page.getByText("Succeeded", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Open verified preview" }).click();
    await expect(generated.getByRole("heading", { name: "Counter", exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  } finally {
    await worker.stop(); server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    previewServer.closeAllConnections();
    await new Promise<void>((resolve) => previewServer.close(() => resolve()));
    db.close();
  }
});
