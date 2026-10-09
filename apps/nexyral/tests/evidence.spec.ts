import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import { openDatabase } from "../server/database.ts";
import { createApp } from "../server/app.ts";
import { createProject, createRun } from "../server/runs.ts";

for (const theme of ["dark", "light"] as const) for (const width of [375, 1440]) {
  test(`evidence overview reports stored outcomes ${theme} ${width}`, async ({ page }) => {
    const db = openDatabase(":memory:");
    const origins: string[] = [];
    const server = createApp({ db, origins, staticDir: "dist" });
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`; origins.push(origin);
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
    try {
      await page.setViewportSize({ width, height: 950 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(`${origin}/get-started`); await page.selectOption("select", theme);
      await page.getByLabel("Your name").fill("Evidence Reviewer");
      await page.getByLabel("Email", { exact: true }).fill(`evidence-${theme}-${width}@example.test`);
      await page.getByLabel("Password", { exact: true }).fill("a-long-evidence-browser-password");
      await page.getByRole("button", { name: "Create account", exact: true }).click();
      await expect(page).toHaveURL(`${origin}/workspace`);
      const owner = db.prepare("SELECT id FROM users").get() as { id: string };
      const project = createProject(db, owner.id, "Controlled evidence fixtures");
      const compilerChecks = [{ name: "TypeScript", exitCode: 0 }, { name: "Vite production build", exitCode: 0 }];
      const cases = [
        { name: "Missing", content: undefined, expected: ["Not recorded", "Not recorded", "Not recorded"] },
        { name: "Compiler failure", content: JSON.stringify({ checks: [{ name: "TypeScript", exitCode: 2 }], testsRun: false, behavior: { status: "not_run", results: [], reason: "Compilation failed before browser execution." } }), expected: ["Failed", "Not recorded", "Not run"] },
        { name: "Interrupted", content: JSON.stringify({ checks: [{ name: "TypeScript", exitCode: null }], testsRun: false }), expected: ["Incomplete", "Not recorded", "Not run"] },
        { name: "Malformed", content: "{", expected: ["Unreadable evidence", "Unreadable evidence", "Unreadable evidence"] },
        { name: "Malformed browser", content: JSON.stringify({ checks: compilerChecks, testsRun: true, behavior: { status: "passed", results: "invalid" } }), expected: ["Passed", "Passed", "Unreadable evidence"] },
        { name: "Browser failure", content: JSON.stringify({ checks: compilerChecks, testsRun: true, behavior: { status: "failed", results: [{ name: "Fixture interaction", passed: false, error: "Expected result missing" }] } }), expected: ["Passed", "Passed", "Failed"] },
      ];
      for (const fixture of cases) {
        const run = createRun(db, owner.id, project.id, `Review controlled ${fixture.name} evidence fixture.`);
        db.prepare("UPDATE runs SET status='failed',stage='verify' WHERE id=?").run(run.id);
        if (fixture.content !== undefined) db.prepare("INSERT INTO artifacts VALUES(?,?,?,?,?,?)").run(randomUUID(), run.id, "verification.json", "verification", fixture.content, run.createdAt);
        await page.goto(`${origin}/workspace/runs/${run.id}`);
        const overview = page.getByRole("region", { name: "What has actually been checked." });
        await expect(overview).toBeVisible();
        for (const [index, label] of ["Type checking", "Production build", "Browser behavior"].entries()) await expect(overview.locator("li").filter({ has: page.getByText(label, { exact: true }) }).locator(".evidence-state")).toHaveText(fixture.expected[index]);
        await expect(overview.locator(".evidence-state").filter({ hasText: /^Not run$/ })).toHaveCount(fixture.expected.filter(state => state === "Not run").length + 4);
        await expect(overview.locator(".evidence-availability")).toContainText("Unavailable");
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        if (fixture.name === "Browser failure") {
          await expect(page.getByRole("heading", { name: "Behavior checks failed." })).toBeVisible();
          await page.evaluate(() => window.scrollTo(0, 0));
          await page.screenshot({ path: `artifacts/evidence-${width}-${theme}.png`, fullPage: true });
        }
      }
      expect(errors).toEqual([]);
    } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); db.close(); }
  });
}
