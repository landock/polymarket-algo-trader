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

test("renders positions from service worker response", async () => {
  await clearExtensionStorage(context);
  await setE2EOverrides(context, {
    walletAddresses: {
      eoaAddress: "0x1111111111111111111111111111111111111111",
      proxyAddress: "0x2222222222222222222222222222222222222222",
    },
    positions: [
      {
        proxyWallet: "0x2222222222222222222222222222222222222222",
        asset: "token-yes",
        conditionId: "cond-1",
        size: 12.5,
        avgPrice: 0.42,
        initialValue: 5.25,
        currentValue: 6.25,
        cashPnl: 1.0,
        percentPnl: 19.05,
        realizedPnl: 0,
        percentRealizedPnl: 0,
        curPrice: 0.5,
        totalBought: 12.5,
        title: "Test Market Position",
        slug: "test-market-position",
        eventSlug: "event-1",
        icon: "https://example.com/icon.png",
        outcome: "Yes",
        outcomeIndex: 0,
        oppositeOutcome: "No",
        oppositeAsset: "token-no",
        endDate: new Date().toISOString(),
        redeemable: false,
        mergeable: false,
        negativeRisk: false,
      },
    ],
  });

  const page = await context.newPage();
  await page.goto("https://polymarket.com/");

  await unlockWallet(page);
  await expect(page.locator("[data-cy=positions-list]")).toBeVisible();
  await expect(page.getByText("Test Market Position")).toBeVisible();
});

test("shows error when positions fetch fails", async () => {
  await clearExtensionStorage(context);
  await setE2EOverrides(context, {
    walletAddresses: {
      eoaAddress: "0x1111111111111111111111111111111111111111",
      proxyAddress: "0x2222222222222222222222222222222222222222",
    },
    positionsError: "Error loading positions",
  });

  const page = await context.newPage();
  await page.goto("https://polymarket.com/");

  await unlockWallet(page);
  await expect(page.locator("[data-cy=positions-error]")).toBeVisible();
  await expect(page.locator("[data-cy=positions-error]")).toContainText(
    "Error loading positions"
  );
});
