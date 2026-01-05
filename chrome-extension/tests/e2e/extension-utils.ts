import path from "path";
import { chromium, type BrowserContext, type Page } from "@playwright/test";

const extensionPath = path.resolve(__dirname, "..", "..", "build");

export async function launchExtensionContext(): Promise<BrowserContext> {
  return chromium.launchPersistentContext("", {
    headless: process.env.HEADLESS === "1",
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });
}

export async function getExtensionId(
  context: BrowserContext
): Promise<string> {
  const worker =
    context.serviceWorkers()[0] ||
    (await context.waitForEvent("serviceworker"));
  const url = worker.url();
  return url.split("/")[2];
}

export async function openExtensionPage(
  context: BrowserContext,
  extensionId: string,
  pathName: string
): Promise<Page> {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/${pathName}`);
  return page;
}

export async function clearExtensionStorage(
  context: BrowserContext
): Promise<void> {
  const worker =
    context.serviceWorkers()[0] ||
    (await context.waitForEvent("serviceworker"));
  await worker.evaluate(() => chrome.storage.local.clear());
}

export async function setExtensionStorage(
  context: BrowserContext,
  value: Record<string, unknown>
): Promise<void> {
  const worker =
    context.serviceWorkers()[0] ||
    (await context.waitForEvent("serviceworker"));
  await worker.evaluate((data) => chrome.storage.local.set(data), value);
}
