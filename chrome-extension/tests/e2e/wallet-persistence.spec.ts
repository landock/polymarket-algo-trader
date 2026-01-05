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

test("shows unlock form after wallet is imported", async () => {
  await clearExtensionStorage(context);

  const page = await context.newPage();
  await page.goto("https://polymarket.com/");

  const privateKey = `0x${"1".repeat(64)}`;
  await page.fill("[data-cy=import-private-key]", privateKey);
  await page.fill("[data-cy=import-password]", "password123");
  await page.click("[data-cy=import-submit]");

  await page.waitForSelector("[data-cy=lock-wallet]");
  await page.reload();

  await expect(page.locator("[data-cy=wallet-unlock]")).toBeVisible();
});
