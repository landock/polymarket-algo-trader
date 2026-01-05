import { stubRuntimeMessages } from "../support/utils";

describe("positions runtime messaging", () => {
  it("renders positions from background response", () => {
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
        case "QUICK_SELL_POSITION":
          return { success: true, orderId: "order-123" };
        case "GET_POSITIONS":
          return {
            success: true,
            data: [
              {
                asset: "token-yes",
                title: "Will it rain tomorrow?",
                outcome: "Yes",
                size: 2,
                curPrice: 0.55,
                eventSlug: "rain",
                outcomeIndex: 0,
              },
            ],
          };
        default:
          return { success: true, data: [] };
      }
    });

    const privateKey = `0x${"1".repeat(64)}`;
    cy.get("[data-cy=import-private-key]", { timeout: 15000 }).type(privateKey);
    cy.get("[data-cy=import-password]").type("password123");
    cy.get("[data-cy=import-submit]").click();

    cy.contains("My Positions").should("be.visible");
    cy.contains("Will it rain tomorrow?").should("be.visible");

    cy.on("window:confirm", () => true);
    cy.on("window:alert", (message) => {
      expect(message).to.contain("Position sold successfully");
    });
    cy.get("[data-cy=position-quick-sell]").click();
  });
});
