if (Cypress.browser.family !== "chromium") {
  throw new Error(
    `Extension tests require Chrome/Chromium. Current browser: ${Cypress.browser.name}`
  );
}

Cypress.on("uncaught:exception", () => {
  return false;
});
