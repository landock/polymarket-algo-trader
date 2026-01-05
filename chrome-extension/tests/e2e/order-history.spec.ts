import { test, expect } from "@playwright/test";
import {
  launchExtensionContext,
  setExtensionStorage,
} from "./extension-utils";

let context: Awaited<ReturnType<typeof launchExtensionContext>>;

test.beforeAll(async () => {
  context = await launchExtensionContext();
});

test.afterAll(async () => {
  await context.close();
});

test("renders completed and cancelled orders from storage", async () => {
  await setExtensionStorage(context, {
    algo_orders: [
      {
        id: "hist-1",
        type: "TRAILING_STOP",
        status: "COMPLETED",
        side: "BUY",
        size: 1,
        tokenId: "token-yes",
        createdAt: Date.now() - 10000,
        updatedAt: Date.now() - 5000,
        executionHistory: [{ price: 0.55, size: 1 }],
        executedSize: 1,
        params: { trailPercent: 5 },
      },
      {
        id: "hist-2",
        type: "TWAP",
        status: "CANCELLED",
        side: "SELL",
        size: 2,
        tokenId: "token-no",
        createdAt: Date.now() - 20000,
        updatedAt: Date.now() - 15000,
        params: { durationMinutes: 60, intervalMinutes: 5 },
      },
    ],
  });

  const page = await context.newPage();
  await page.goto("https://polymarket.com/");

  await page.click("[data-cy=order-history-toggle]");
  await expect(page.locator("[data-cy=order-history-list]")).toBeVisible();
  await expect(page.locator("[data-cy=order-history-hist-1]")).toBeVisible();
  await expect(page.locator("[data-cy=order-history-hist-2]")).toBeVisible();
});
