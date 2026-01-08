import fs from "fs";
import os from "os";
import path from "path";
import {
  chromium,
  type BrowserContext,
  type Page,
  type Worker,
} from "@playwright/test";

const extensionPath = path.resolve(__dirname, "..", "..", "build");
const serviceWorkerTimeoutMs = Number(
  process.env.PW_SW_TIMEOUT_MS ?? "15000"
);
const viewportWidth = Number(process.env.PW_VIEWPORT_WIDTH ?? "1400");
const viewportHeight = Number(process.env.PW_VIEWPORT_HEIGHT ?? "2000");

export async function launchExtensionContext(): Promise<BrowserContext> {
  if (!fs.existsSync(extensionPath)) {
    throw new Error(
      `Extension build not found at ${extensionPath}. Run "bun run build" from chrome-extension.`
    );
  }

  const userDataDir = path.join(os.tmpdir(), `pw-ext-${Date.now()}`);
  return chromium.launchPersistentContext(userDataDir, {
    timeout: 30_000,
    headless: process.env.HEADLESS === "1",
    viewport: {
      width: viewportWidth,
      height: viewportHeight,
    },
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });
}

async function waitForServiceWorker(
  context: BrowserContext
): Promise<Worker> {
  const existing = context.serviceWorkers()[0];
  if (existing) {
    return existing;
  }

  try {
    return await context.waitForEvent("serviceworker", {
      timeout: serviceWorkerTimeoutMs,
    });
  } catch (error) {
    throw new Error(
      `Timed out waiting for extension service worker. Ensure Chromium launches and the extension builds. (${String(
        error
      )})`
    );
  }
}

export async function getExtensionId(
  context: BrowserContext
): Promise<string> {
  const worker = await waitForServiceWorker(context);
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
  const worker = await waitForServiceWorker(context);
  await worker.evaluate(() => chrome.storage.local.clear());
}

export async function setExtensionStorage(
  context: BrowserContext,
  value: Record<string, unknown>
): Promise<void> {
  const worker = await waitForServiceWorker(context);
  await worker.evaluate((data) => chrome.storage.local.set(data), value);
}

export async function setE2EOverrides(
  context: BrowserContext,
  overrides: Record<string, unknown>
): Promise<void> {
  await setExtensionStorage(context, { e2e_overrides: overrides });
}

export async function unlockWallet(
  page: Page,
  options?: { privateKey?: string; password?: string }
): Promise<void> {
  const privateKey = options?.privateKey ?? `0x${"1".repeat(64)}`;
  const password = options?.password ?? "password123";

  await page.fill("[data-cy=import-private-key]", privateKey);
  await page.fill("[data-cy=import-password]", password);
  await page.click("[data-cy=import-submit]");
  await page.waitForSelector("[data-cy=lock-wallet]");
}
