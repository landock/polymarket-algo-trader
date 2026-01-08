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

test("shows validation errors for stop-loss without prices", async () => {
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
  await page.click("[data-cy=create-algo-order]");
  await page.selectOption("[data-cy=order-type]", "STOP_LOSS");
  await page.fill("[data-cy=token-id]", "token-yes-12345");
  await page.fill("[data-cy=order-size]", "1");
  await page.click("[data-cy=order-submit]");

  await expect(page.locator("[data-cy=order-validation]")).toBeVisible();
  await expect(page.locator("[data-cy=order-validation]")).toContainText(
    "At least one of Stop-Loss or Take-Profit price is required"
  );
});
