import { getExtensionId } from "../support/utils";

describe("popup and settings", () => {
  it("opens popup and settings page", () => {
    cy.visit("/");

    getExtensionId().then((extensionId) => {
      cy.visit(`chrome-extension://${extensionId}/popup/popup.html`);
      cy.get("[data-cy=popup-title]").should(
        "contain",
        "Polymarket Algo Trader"
      );
      cy.get("[data-cy=open-settings]").click();
    });
  });

  it("clears data from settings", () => {
    cy.visit("/");

    getExtensionId().then((extensionId) => {
      cy.visit(`chrome-extension://${extensionId}/popup/settings.html`);

      cy.window().then(
        (win) =>
          new Cypress.Promise((resolve) => {
            win.chrome.storage.local.set({ testKey: "value" }, () => resolve());
          })
      );

      cy.on("window:confirm", () => true);
      cy.on("window:alert", (message) => {
        expect(message).to.contain("All data cleared");
      });

      cy.get("[data-cy=clear-data]").click();

      cy.window()
        .then(
          (win) =>
            new Cypress.Promise((resolve) => {
              win.chrome.storage.local.get("testKey", (result) =>
                resolve(result)
              );
            })
        )
        .then((result) => {
          expect(result).to.have.property("testKey", undefined);
        });
    });
  });
});
