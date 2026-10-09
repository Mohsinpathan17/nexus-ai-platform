import { test, expect } from "@playwright/test";
for (const theme of ["dark", "light"] as const) for (const width of [375, 1440]) {
  test(`public workflow guide ${theme} ${width}`, async ({ page }) => {
    const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
    await page.setViewportSize({ width, height: 950 }); await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/docs"); await page.locator('select[aria-label="Color theme"]').selectOption(theme);
    const guide = page.getByRole("region", { name: "Getting started workflow" });
    await expect(guide.getByRole("heading", { level: 2 })).toHaveCount(6);
    await expect(guide).toContainText("cannot create a complete backend");
    await expect(guide).toContainText("Missing evidence is not a pass");
    await expect(guide).toContainText("Password recovery currently needs help");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `artifacts/guide-${width}-${theme}.png`, fullPage: true });
    const start = guide.getByRole("link", { name: "Open getting started →", exact: true });
    await start.focus(); await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/get-started$/);
    await expect(page.getByRole("button", { name: "Create account", exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });
}
