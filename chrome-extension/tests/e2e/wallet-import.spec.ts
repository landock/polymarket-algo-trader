import { test, expect } from "@playwright/test";
import {
  launchExtensionContext,
  clearExtensionStorage,
} from "./extension-utils";

let context: Awaited<ReturnType<typeof launchExtensionContext>>;

test.beforeAll(async () => {
  context = await launchExtensionContext();
});

test.afterAll(async () => {
  await context.close();
});

test("shows validation errors when importing wallet", async () => {
  await clearExtensionStorage(context);

  const page = await context.newPage();
  await page.goto("https://polymarket.com/");

  await expect(page.locator("[data-cy=wallet-import]")).toBeVisible();

  await page.fill("[data-cy=import-private-key]", "0x123");
  await page.fill("[data-cy=import-password]", "short");
  await page.click("[data-cy=import-submit]");
  await expect(page.locator("[data-cy=wallet-error]")).toContainText(
    "Password must be at least 8 characters"
  );
});
