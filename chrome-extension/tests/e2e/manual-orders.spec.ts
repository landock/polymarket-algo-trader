import { test, expect } from "@playwright/test";
import {
  clearExtensionStorage,
  launchExtensionContext,
  setE2EOverrides,
  unlockWallet,
} from "./extension-utils";

let context: Awaited<ReturnType<typeof launchExtensionContext>>;

test.beforeAll(async () => {
  context = await launchExtensionContext();
});

test.afterAll(async () => {
  await context.close();
});

test("validates manual order inputs", async () => {
  await clearExtensionStorage(context);
  await setE2EOverrides(context, {
    walletAddresses: {
      eoaAddress: "0x1111111111111111111111111111111111111111",
      proxyAddress: "0x2222222222222222222222222222222222222222",
    },
  });

  const page = await context.newPage();
  await page.goto("https://polymarket.com/");

  await unlockWallet(page);
  await expect(page.locator("[data-cy=manual-order-form]")).toBeVisible();

  await page.click("[data-cy=manual-submit]");
  await expect(page.locator("[data-cy=manual-order-error]")).toContainText(
    "Token ID is required"
  );

  await page.fill("[data-cy=manual-token-id]", "token-yes");
  await page.fill("[data-cy=manual-size]", "0");
  await page.click("[data-cy=manual-submit]");
  await expect(page.locator("[data-cy=manual-order-error]")).toContainText(
    "Size must be greater than 0"
  );

  await page.click("[data-cy=manual-order-limit-tab]");
  await page.fill("[data-cy=manual-token-id]", "token-yes");
  await page.fill("[data-cy=manual-size]", "1");
  await page.click("[data-cy=manual-submit]");
  await expect(page.locator("[data-cy=manual-order-error]")).toContainText(
    "Limit price must be greater than 0"
  );
});
