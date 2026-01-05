import { defineConfig } from "cypress";
import path from "path";
import fs from "fs";

const extensionPath = path.resolve(__dirname, "build");

export default defineConfig({
  e2e: {
    baseUrl: "https://polymarket.com",
    supportFile: "cypress/support/e2e.ts",
    specPattern: "cypress/e2e/**/*.cy.ts",
    chromeWebSecurity: false,
    setupNodeEvents(on, config) {
      const manifestPath = path.resolve(__dirname, "build", "manifest.json");
      if (!fs.existsSync(manifestPath)) {
        throw new Error(
          "Extension build missing. Run `npm run build` before Cypress."
        );
      }
      on("before:browser:launch", (browser, launchOptions) => {
        if (browser.family === "chromium") {
          if (browser.isHeadless) {
            throw new Error(
              "Chrome headless does not load extensions. Run with `--headed`."
            );
          }
          launchOptions.args = launchOptions.args.filter(
            (arg) =>
              arg !== "--disable-extensions" &&
              arg !== "--disable-component-extensions-with-background-pages"
          );
          launchOptions.args.push(
            `--disable-extensions-except=${extensionPath}`,
            `--load-extension=${extensionPath}`
          );
        }
        return launchOptions;
      });
      return config;
    },
  },
  video: false,
});
