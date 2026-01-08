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

test("creates, pauses, resumes, and cancels an algo order", async () => {
  await clearExtensionStorage(context);
  await setE2EOverrides(context, {
    walletAddresses: {
      eoaAddress: "0x1111111111111111111111111111111111111111",
      proxyAddress: "0x2222222222222222222222222222222222222222",
    },
  });

  const page = await context.newPage();
  await page.goto("https://polymarket.com/");

  page.on("dialog", async (dialog) => {
    await dialog.accept();
  });

  await unlockWallet(page);

  await page.click("[data-cy=create-algo-order]");
  await page.fill("[data-cy=token-id]", "token-yes");
  await page.fill("[data-cy=order-size]", "5");
  await page.click("[data-cy=order-submit]");

  await expect(page.locator("[data-cy=order-preview]")).toBeVisible();
  await page.click("[data-cy=order-preview-confirm]");

  const order = page.locator(
    "[data-cy=active-orders-list] > [data-cy^=algo-order-]"
  );
  await expect(order).toHaveCount(1);
  await expect(order.first()).toContainText("ACTIVE");

  await order.locator("[data-cy^=algo-order-pause-]").click();
  await expect(order.first()).toContainText("PAUSED");

  await order.locator("[data-cy^=algo-order-resume-]").click();
  await expect(order.first()).toContainText("ACTIVE");

  await order.locator("[data-cy^=algo-order-cancel-]").click();
  await expect(order).toHaveCount(0);
});
