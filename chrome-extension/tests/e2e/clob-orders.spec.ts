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

test("renders CLOB orders from service worker response", async () => {
  await clearExtensionStorage(context);
  await setE2EOverrides(context, {
    walletAddresses: {
      eoaAddress: "0x1111111111111111111111111111111111111111",
      proxyAddress: "0x2222222222222222222222222222222222222222",
    },
    clobOrders: [
      {
        id: "clob-1",
        status: "LIVE",
        owner: "0x1111111111111111111111111111111111111111",
        maker_address: "0x1111111111111111111111111111111111111111",
        market: "market-1",
        asset_id: "asset-1",
        side: "BUY",
        original_size: "10",
        size_matched: "2",
        price: "0.45",
        outcome: "Yes",
        created_at: new Date().toISOString(),
      },
    ],
  });
  const page = await context.newPage();
  await page.goto("https://polymarket.com/");

  await unlockWallet(page);
  await expect(page.locator("[data-cy=clob-orders]")).toBeVisible();
  await expect(page.locator("[data-cy=clob-orders-list]")).toBeVisible();
  await expect(page.locator("[data-cy=clob-order-clob-1]")).toBeVisible();
});

test("shows unlock prompt when no active trading session", async () => {
  await clearExtensionStorage(context);
  await setE2EOverrides(context, {});

  const page = await context.newPage();
  await page.goto("https://polymarket.com/");

  await unlockWallet(page);
  await expect(
    page.locator("[data-cy=clob-orders-session-required]")
  ).toBeVisible();
});

test("shows error when CLOB orders fetch fails", async () => {
  await clearExtensionStorage(context);
  await setE2EOverrides(context, {
    clobOrdersError: "CLOB unavailable",
  });

  const page = await context.newPage();
  await page.goto("https://polymarket.com/");

  await unlockWallet(page);
  await expect(page.locator("[data-cy=clob-orders-error]")).toBeVisible();
  await expect(page.locator("[data-cy=clob-orders-error]")).toContainText(
    "CLOB unavailable"
  );
});
