import { test, expect } from "@playwright/test";
import {
  launchExtensionContext,
} from "./extension-utils";

let context: Awaited<ReturnType<typeof launchExtensionContext>>;

test.beforeAll(async () => {
  context = await launchExtensionContext();
});

test.afterAll(async () => {
  await context.close();
});

test("injects panel and toggles collapse", async () => {
  const page = await context.newPage();
  await page.goto("https://polymarket.com/");

  await page.waitForSelector("#polymarket-algo-extension");
  await expect(page.locator("[data-cy=algo-panel]")).toBeVisible();
  await expect(page.locator("[data-cy=algo-panel-body]")).toBeVisible();

  await page.click("[data-cy=algo-panel-header]");
  await expect(page.locator("[data-cy=algo-panel-body]")).toBeHidden();

  await page.click("[data-cy=algo-panel-header]");
  await expect(page.locator("[data-cy=algo-panel-body]")).toBeVisible();
});
