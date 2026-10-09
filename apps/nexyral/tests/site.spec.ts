import { test, expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
const sections = [
  "problem",
  "how-it-works",
  "watch",
  "workspace",
  "intelligence",
  "repair",
  "verification",
  "deployment",
  "features",
  "solutions",
  "pricing",
  "final-cta",
];
test("Core stages respond to keyboard selection in reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const stage = page.getByRole("button", { name: "04 VERIFY", exact: true });
  await stage.focus();
  await page.keyboard.press("Enter");
  await expect(stage).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".core-controls p")).toContainText("Measured checks expose failures");
  await expect(page.getByRole("button", { name: "01 INTENT", exact: true })).toHaveAttribute("aria-pressed", "false");
});
function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}
async function inspectSections(page: Page) {
  for (const id of sections) {
    await page.locator(`#${id}`).scrollIntoViewIfNeeded();
    await expect(page.locator(`#${id} h2`)).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `overflow at ${id}`,
    ).toBe(true);
    await page.waitForTimeout(80);
  }
}
for (const theme of ["dark", "light"] as const) {
  for (const width of [1440, 768, 375, 390, 430]) {
    test(`${theme} / ${width}px / all sections and overflow`, async ({
      page,
    }) => {
      const errors = collectErrors(page);
      await page.setViewportSize({ width, height: width > 1000 ? 1000 : 844 });
      await page.goto("/");
      await page.selectOption('select[aria-label="Color theme"]', theme);
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await inspectSections(page);
      await page.locator("#main").evaluate((node) => node.scrollIntoView());
      await page.waitForTimeout(700);
      if (width === 1440 || width === 390) {
        mkdirSync("artifacts", { recursive: true });
        await page.screenshot({
          path: `artifacts/${width === 1440 ? "desktop" : "mobile"}-${theme}.png`,
          fullPage: true,
        });
      }
      expect(errors).toEqual([]);
    });
  }
}
test("interactive engineering narrative and keyboard control", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Explore inside the engine" }).click();
  await expect(page.locator("#internal-workflow")).toBeVisible();
  await page.locator("#workflow-tab-0").focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.locator("#workflow-panel")).toContainText(
    "Build the blueprint first.",
  );
  await expect(page.locator("#workflow-tab-1")).toBeFocused();
  await page
    .getByRole("button", { name: "Run execution", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Pause execution", exact: true })
    .click();
  const progress = await page
    .getByRole("progressbar")
    .getAttribute("aria-valuenow");
  await page.waitForTimeout(750);
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    progress!,
  );
  await page
    .getByRole("button", { name: "Run execution", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Replay execution" }),
  ).toBeVisible({ timeout: 15000 });
  await page.getByRole("button", { name: "Replay execution" }).click();
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "0",
  );
  await page.getByRole("button", { name: "Pause execution" }).click();
  await page.getByRole("button", { name: "tickets.ts", exact: true }).click();
  await expect(page.locator(".code-pane")).toContainText("ticketSchema.parse");
  await page.getByRole("button", { name: "schema.sql", exact: true }).click();
  await expect(page.locator(".code-pane")).toContainText("CREATE TABLE");
  await page.getByRole("button", { name: "Dependencies", exact: true }).click();
  await expect(page.locator(".memory-detail h3")).toHaveText("Dependencies");
  for (let i = 0; i < 5; i++)
    await page.getByRole("button", { name: "Next recovery step" }).click();
  await expect(page.locator(".repair-evidence")).toContainText(
    "SYSTEM RECOVERED",
  );
  await expect(page.locator(".repair-evidence")).toContainText(
    "System recovered",
  );
  await page.getByRole("button", { name: "Replay recovery" }).click();
  await expect(page.locator(".repair-evidence")).toContainText("BUILD FAILED");
  await page.locator("#audience-0").focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#audience-panel")).toContainText(
    "Stay close to the decisions.",
  );
  await expect(
    page.getByRole("button", { name: "Approve deployment" }),
  ).toBeDisabled();
  expect(errors).toEqual([]);
});
test("system theme reacts to OS and preferences persist", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await page.selectOption("select", "system");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.selectOption("select", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});
test("all dedicated routes and mobile navigation", async ({ page }) => {
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.locator("#mobile-navigation")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#mobile-navigation")).not.toBeVisible();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .locator("#mobile-navigation")
    .getByRole("link", { name: "Pricing", exact: true })
    .click();
  await expect(page).toHaveURL(/\/pricing$/);
  await expect(page.locator("#mobile-navigation")).not.toBeVisible();
  for (const route of [
    "product",
    "how-it-works",
    "features",
    "solutions",
    "pricing",
    "docs",
    "about",
    "contact",
    "status",
    "privacy",
    "terms",
    "login",
    "get-started",
    "not-found",
    "product/",
    "pricing/",
  ]) {
    await page.goto(`/${route}`);
    await expect(page.locator("h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      route,
    ).toBe(true);
  }
  await page.goto("/docs");
  await page.getByRole("link", { name: "See verification concepts" }).click();
  await expect(page.locator("#verification")).toBeInViewport();
  expect(errors).toEqual([]);
});
test("reduced motion shows completed run and WebGL fallback remains usable", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      type: string,
      ...args: unknown[]
    ) {
      if (type.startsWith("webgl")) return null;
      return Reflect.apply(original, this, [type, ...args]);
    } as typeof original;
  });
  await page.goto("/");
  await expect(page.locator(".core-fallback")).toBeVisible();
  await expect(page.locator(".core-labels .node-label")).toHaveCount(5);
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "12",
  );
  await expect(
    page.getByRole("button", { name: "Final state · reduced motion" }),
  ).toBeDisabled();
  await inspectSections(page);
  expect(errors).toEqual([]);
});
test("real WebGL core and desktop navigation", async ({ page }) => {
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(page.locator(".core-canvas canvas")).toBeVisible();
  await expect(page.locator(".core-fallback")).toHaveCount(0);
  await expect(page.locator(".core-labels .node-label")).toHaveCount(5);
  for (const route of [
    { name: "Product", path: "product" },
    { name: "How It Works", path: "how-it-works" },
    { name: "Features", path: "features" },
    { name: "Solutions", path: "solutions" },
    { name: "Pricing", path: "pricing" },
  ]) {
    await page
      .locator(".desktop-nav")
      .getByRole("link", { name: route.name, exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`/${route.path}$`));
    await expect(page.locator("h1")).toBeVisible();
  }
  await page.locator(".logo").first().click();
  await expect(page.locator("#hero-title")).toBeVisible();
  await page.getByRole("link", { name: "Watch NEXYRAL Work" }).click();
  await expect(page.locator("#watch")).toBeInViewport();
  expect(errors).toEqual([]);
});
