import { test, expect } from "@playwright/test";
import { launchExtensionContext } from "./extension-utils";

let context: Awaited<ReturnType<typeof launchExtensionContext>>;

test.beforeAll(async () => {
  context = await launchExtensionContext();
});

test.afterAll(async () => {
  await context.close();
});

test("renders CLOB orders section", async () => {
  const page = await context.newPage();
  await page.goto("https://polymarket.com/");

  await expect(page.locator("[data-cy=clob-orders]")).toBeVisible();
});
