import { test, expect } from "@playwright/test";
import {
  launchExtensionContext,
  clearExtensionStorage,
  setE2EOverrides,
  setExtensionStorage,
  unlockWallet,
} from "./extension-utils";

let context: Awaited<ReturnType<typeof launchExtensionContext>>;

test.beforeAll(async () => {
  context = await launchExtensionContext();
});

test.afterAll(async () => {
  await context.close();
});

test("renders completed and cancelled orders from storage", async () => {
  await clearExtensionStorage(context);
  await setE2EOverrides(context, {
    walletAddresses: {
      eoaAddress: "0x1111111111111111111111111111111111111111",
      proxyAddress: "0x2222222222222222222222222222222222222222",
    },
  });
  await setExtensionStorage(context, {
    order_history: [
      {
        id: "hist-1",
        timestamp: Date.now() - 10000,
        orderType: "ALGO",
        algoType: "TRAILING_STOP",
        tokenId: "token-yes",
        side: "BUY",
        size: 1,
        price: 0.55,
        status: "EXECUTED",
      },
      {
        id: "hist-2",
        timestamp: Date.now() - 20000,
        orderType: "ALGO",
        algoType: "TWAP",
        tokenId: "token-no",
        side: "SELL",
        size: 2,
        price: 0.45,
        status: "CANCELLED",
      },
    ],
  });

  const page = await context.newPage();
  await page.goto("https://polymarket.com/");

  await unlockWallet(page);
  await page.click("[data-cy=order-history-toggle]");
  await expect(page.locator("[data-cy=order-history-list]")).toBeVisible();
  await expect(page.locator("[data-cy=order-history-hist-1]")).toBeVisible();
  await expect(page.locator("[data-cy=order-history-hist-2]")).toBeVisible();
});

test("exports order history to CSV", async () => {
  await clearExtensionStorage(context);
  await setE2EOverrides(context, {
    walletAddresses: {
      eoaAddress: "0x1111111111111111111111111111111111111111",
      proxyAddress: "0x2222222222222222222222222222222222222222",
    },
  });
  await setExtensionStorage(context, {
    order_history: [
      {
        id: "hist-csv-1",
        timestamp: Date.now() - 10000,
        orderType: "MARKET",
        tokenId: "token-yes",
        side: "BUY",
        size: 10,
        price: 0.55,
        executedPrice: 0.56,
        status: "EXECUTED",
        marketQuestion: "Will it rain tomorrow?",
        outcome: "Yes",
      },
      {
        id: "hist-csv-2",
        timestamp: Date.now() - 20000,
        orderType: "LIMIT",
        tokenId: "token-no",
        side: "SELL",
        size: 5,
        price: 0.45,
        status: "PENDING",
        marketQuestion: "Will stocks go up?",
        outcome: "No",
      },
    ],
  });

  const page = await context.newPage();
  await page.goto("https://polymarket.com/");

  await unlockWallet(page);
  await page.click("[data-cy=order-history-toggle]");
  await expect(page.locator("[data-cy=order-history-list]")).toBeVisible();

  // Set up download handler
  const downloadPromise = page.waitForEvent("download");

  // Click export button
  await page.click("[data-cy=export-csv-button]");

  // Wait for download
  const download = await downloadPromise;

  // Verify download filename pattern
  expect(download.suggestedFilename()).toMatch(
    /polymarket-order-history-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.csv/
  );

  // Read CSV content
  const csvContent = await download
    .createReadStream()
    .then(
      (stream) =>
        new Promise<string>((resolve, reject) => {
          const chunks: Buffer[] = [];
          if (!stream) {
            reject(new Error("No stream"));
            return;
          }
          stream.on("data", (chunk) => chunks.push(chunk));
          stream.on("end", () => resolve(Buffer.concat(chunks).toString()));
          stream.on("error", reject);
        })
    );

  // Verify CSV headers
  expect(csvContent).toContain("Timestamp,Date,Order Type");
  expect(csvContent).toContain("Market Question");
  expect(csvContent).toContain("MARKET");
  expect(csvContent).toContain("LIMIT");
  expect(csvContent).toContain("Will it rain tomorrow?");
  expect(csvContent).toContain("Will stocks go up?");
});
