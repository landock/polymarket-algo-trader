import { test, expect } from "@playwright/test";
import {
  launchExtensionContext,
  getExtensionId,
  openExtensionPage,
} from "./extension-utils";

let context: Awaited<ReturnType<typeof launchExtensionContext>>;
let extensionId: string;

test.beforeAll(async () => {
  context = await launchExtensionContext();
  extensionId = await getExtensionId(context);
});

test.afterAll(async () => {
  await context.close();
});

test("popup actions", async () => {
  const page = await openExtensionPage(context, extensionId, "popup/popup.html");

  await expect(page.locator("[data-cy=popup-title]")).toHaveText(
    "Polymarket Algo Trader"
  );

  const settingsPromise = context.waitForEvent("page");
  await page.click("[data-cy=open-settings]");
  const settingsPage = await settingsPromise;
  await settingsPage.waitForLoadState();
  expect(settingsPage.url()).toContain("popup/settings.html");
  await settingsPage.close();
});
