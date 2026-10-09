import { test, expect } from "@playwright/test";
for (const theme of ["dark", "light"] as const) {
  for (const width of [375, 1440]) {
    test(`project brief and run history ${theme} ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 950 });
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
      await page.goto("/get-started"); await page.selectOption("select", theme);
      await page.getByLabel("Your name").fill("Requirements Owner");
      await page.getByLabel("Email", { exact: true }).fill(`brief-${theme}-${width}-${Date.now()}@example.test`);
      await page.getByLabel("Password", { exact: true }).fill("a-long-brief-browser-password");
      await page.getByRole("button", { name: "Create account", exact: true }).click();
      await page.getByRole("button", { name: "New project", exact: true }).click();
      await page.getByLabel("Project name").fill("Atlas customer operations");
      await page.getByRole("button", { name: "Create project", exact: true }).click();
      await page.getByRole("link", { name: /Atlas customer operations/ }).click();
      const projectUrl = page.url();
      await page.getByRole("button", { name: "Add requirements", exact: true }).click();
      await expect(page.getByLabel("Project requirements", { exact: true })).toBeFocused();
      await expect(page.getByRole("button", { name: "Create engineering run" })).toBeDisabled();
      await page.getByLabel("Project requirements", { exact: true }).fill("Audience: support agents.\nConstraints: keyboard accessible; local state only.\nAcceptance: clear ticket assignment.");
      await page.getByRole("button", { name: "Save requirements", exact: true }).click();
      await expect(page.getByText("SAVED / REVISION 1", { exact: true })).toBeVisible();
      await page.reload();
      await expect(page.getByLabel("Saved project requirements")).toContainText("keyboard accessible");
      await page.getByLabel("What do you want to build?").fill("Build the local accessible ticket assignment interface.");
      await page.getByRole("button", { name: "Create engineering run" }).click();
      await expect(page).toHaveURL(/\/workspace\/runs\//);
      await expect(page.getByText("project-requirements.json", { exact: true })).toBeVisible();
      await page.goto(projectUrl);
      await page.getByRole("button", { name: "Edit requirements", exact: true }).click();
      await page.getByLabel("Project requirements", { exact: true }).fill("Future iterations need a local reporting view.");
      await page.getByRole("button", { name: "Save requirements", exact: true }).click();
      await expect(page.getByText("SAVED / REVISION 2", { exact: true })).toBeVisible();
      await page.getByLabel("What do you want to build?").fill("Build a reporting view for the local ticket counts.");
      await page.getByRole("button", { name: "Create engineering run" }).click();
      await expect(page).toHaveURL(/\/workspace\/runs\//);
      await page.getByRole("button", { name: "Cancel run", exact: true }).click();
      await expect(page.getByText("Cancelled", { exact: true })).toBeVisible();
      await page.goto(projectUrl);
      await page.getByRole("combobox", { name: "Run status", exact: true }).selectOption("cancelled");
      await expect(page.locator(".run-list>li")).toHaveCount(1);
      await page.getByLabel("Find a run").fill("TICKET COUNTS");
      await expect(page.locator(".run-list>li")).toHaveCount(1);
      await page.getByLabel("Find a run").fill("no match");
      await expect(page.getByRole("heading", { name: "No matching runs." })).toBeVisible();
      await page.getByRole("button", { name: "Clear run filters" }).click();
      await expect(page.locator(".run-list>li")).toHaveCount(2);
      await page.getByRole("combobox", { name: "Sort runs", exact: true }).selectOption("oldest");
      await expect(page.locator(".run-list h3").first()).toContainText("assignment interface");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: `artifacts/brief-${width}-${theme}.png`, fullPage: true });
      expect(errors).toEqual([]);
    });
  }
}
