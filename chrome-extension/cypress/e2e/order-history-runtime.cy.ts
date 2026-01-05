import { stubRuntimeMessages, getExtensionId } from "../support/utils";

describe("order history", () => {
  it("renders completed and cancelled orders from storage", () => {
    cy.visit("/");

    stubRuntimeMessages((message) => {
      switch (message.type) {
        case "INITIALIZE_TRADING_SESSION":
          return { success: true };
        case "GET_WALLET_ADDRESSES":
          return {
            success: true,
            data: {
              eoaAddress: "0x1111111111111111111111111111111111111111",
              proxyAddress: "0x2222222222222222222222222222222222222222",
            },
          };
        default:
          return { success: true, data: [] };
      }
    });

    const privateKey = `0x${"1".repeat(64)}`;
    cy.get("[data-cy=import-private-key]", { timeout: 15000 }).type(privateKey);
    cy.get("[data-cy=import-password]").type("password123");
    cy.get("[data-cy=import-submit]").click();

    getExtensionId().then((extensionId) => {
      cy.visit(`chrome-extension://${extensionId}/popup/settings.html`);
      cy.window().then(
        (win) =>
          new Cypress.Promise((resolve) => {
            win.chrome.storage.local.set(
              {
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
              },
              () => resolve()
            );
          })
      );
      cy.visit("/");
    });

    cy.get("[data-cy=order-history-toggle]", { timeout: 15000 }).click();
    cy.get("[data-cy=order-history-list]").should("be.visible");
    cy.get("[data-cy=order-history-hist-1]").should("be.visible");
    cy.get("[data-cy=order-history-hist-2]").should("be.visible");
  });
});
