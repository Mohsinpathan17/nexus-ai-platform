import { test, expect } from "@playwright/test";
for (const theme of ["dark", "light"] as const) {
  for (const width of [375, 1440]) {
    test(`project management ${theme} ${width}: search, sort, rename and retain run history`, async ({ page }) => {
      await page.setViewportSize({ width, height: 950 });
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
      await page.goto("/get-started");
      await page.selectOption("select", theme);
      await page.getByLabel("Your name").fill("Project Manager");
      await page.getByLabel("Email", { exact: true }).fill(`projects-${theme}-${width}-${Date.now()}@example.test`);
      await page.getByLabel("Password", { exact: true }).fill("a-long-project-browser-password");
      await page.getByRole("button", { name: "Create account", exact: true }).click();
      await expect(page).toHaveURL(/\/workspace$/);
      for (const name of ["Atlas support", "Beacon analytics"]) {
        await page.getByRole("button", { name: "New project", exact: true }).click();
        await page.getByLabel("Project name").fill(name);
        await page.getByRole("button", { name: "Create project", exact: true }).click();
        await expect(page.getByRole("link", { name: new RegExp(name) })).toBeVisible();
      }
      await page.getByLabel("Sort projects").selectOption("name");
      await expect(page.locator(".project-list h2").first()).toHaveText("Atlas support");
      await page.getByLabel("Find a project").fill("BEACON");
      await expect(page.locator(".project-list>a")).toHaveCount(1);
      await page.getByLabel("Find a project").fill("missing project");
      await expect(page.getByRole("heading", { name: "No matching projects." })).toBeVisible();
      await page.getByRole("button", { name: "Clear search" }).click();
      await page.getByRole("link", { name: /Atlas support/ }).click();
      const projectUrl = page.url();
      await page.getByLabel("What do you want to build?").fill("Build an accessible support inbox for project operations.");
      await page.getByRole("button", { name: "Create engineering run" }).click();
      await expect(page).toHaveURL(/\/workspace\/runs\//);
      const runUrl = page.url();
      await page.goto(projectUrl);
      await page.getByRole("button", { name: "Rename project", exact: true }).click();
      await expect(page.getByLabel("Project name")).toBeFocused();
      await page.getByLabel("Project name").press("Escape");
      await expect(page.getByRole("button", { name: "Rename project", exact: true })).toBeFocused();
      await page.getByRole("button", { name: "Rename project", exact: true }).click();
      await page.getByLabel("Project name").fill("Atlas engineering");
      const session = await (await page.request.get("/api/auth/session")).json() as { csrfToken: string };
      const elsewhere = await page.request.patch(`/api/projects/${projectUrl.split("/").at(-1)}`, { headers: { Origin: "http://127.0.0.1:4174", "X-CSRF-Token": session.csrfToken }, data: { name: "Atlas elsewhere", expectedName: "Atlas support" } });
      expect(elsewhere.status()).toBe(200);
      await page.getByRole("button", { name: "Save project name" }).click();
      await expect(page.getByText("This project was renamed elsewhere. Refresh before saving again.")).toBeVisible();
      await page.getByRole("button", { name: "Refresh project" }).click();
      await expect(page.getByRole("heading", { name: "Atlas elsewhere", exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Save project name" }).click();
      await expect(page.getByRole("heading", { name: "Atlas engineering", exact: true })).toBeVisible();
      await expect(page.getByText("Project name saved.")).toBeVisible();
      await expect(page.getByRole("button", { name: "Rename project", exact: true })).toBeFocused();
      await expect(page.locator(".run-list>li")).toHaveCount(1);
      await page.reload();
      await expect(page.getByRole("heading", { name: "Atlas engineering", exact: true })).toBeVisible();
      await expect(page.locator(".run-list .attempt-main")).toHaveAttribute("href", new URL(runUrl).pathname);
      await page.getByRole("button", { name: "Rename project", exact: true }).click();
      await page.screenshot({ path: `artifacts/project-settings-${width}-${theme}.png`, fullPage: true });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.getByRole("button", { name: "Cancel", exact: true }).click();
      await page.getByRole("link", { name: "All projects", exact: true }).click();
      await page.getByLabel("Sort projects").selectOption("runs");
      await expect(page.locator(".project-list h2").first()).toHaveText("Atlas engineering");
      await page.getByLabel("Find a project").fill("Atlas engineering");
      await expect(page.locator(".project-list>a")).toHaveCount(1);
      await page.screenshot({ path: `artifacts/projects-${width}-${theme}.png`, fullPage: true });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      // The deliberately stale PATCH produces one expected browser network
      // diagnostic. Additional console errors or page exceptions still fail.
      expect(errors).toEqual(["Failed to load resource: the server responded with a status of 409 (Conflict)"]);
    });
  }
}
