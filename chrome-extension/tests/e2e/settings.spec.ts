import { test, expect } from "@playwright/test";
import {
  launchExtensionContext,
  getExtensionId,
  openExtensionPage,
  setExtensionStorage,
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

test("settings clear data", async () => {
  await setExtensionStorage(context, { testKey: "value" });

  const page = await openExtensionPage(
    context,
    extensionId,
    "popup/settings.html"
  );

  await expect(page.locator("[data-cy=rpc-url-input]")).toBeVisible();

  const dialogs: string[] = [];
  page.on("dialog", async (dialog) => {
    dialogs.push(dialog.message());
    await dialog.accept();
  });

  await page.click("[data-cy=clear-data]");
  expect(dialogs[0]).toContain("Are you sure you want to clear all data?");
  expect(dialogs[1]).toContain("All data cleared");
});
