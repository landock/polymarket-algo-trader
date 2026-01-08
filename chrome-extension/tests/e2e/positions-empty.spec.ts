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

test("shows empty state when no positions", async () => {
  await clearExtensionStorage(context);
  await setE2EOverrides(context, {
    walletAddresses: {
      eoaAddress: "0x1111111111111111111111111111111111111111",
      proxyAddress: "0x2222222222222222222222222222222222222222",
    },
    positions: [],
  });

  const page = await context.newPage();
  await page.goto("https://polymarket.com/");

  await unlockWallet(page);
  await expect(page.locator("[data-cy=positions-empty]")).toBeVisible();
  await expect(page.locator("[data-cy=positions-empty]")).toContainText(
    "Start trading to see your positions here"
  );
});
