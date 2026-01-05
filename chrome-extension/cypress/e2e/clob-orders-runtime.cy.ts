import { stubRuntimeMessages } from "../support/utils";

describe("clob orders runtime messaging", () => {
  it("renders CLOB orders from background response", () => {
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
        case "GET_CLOB_ORDERS":
          return {
            success: true,
            data: [
              {
                id: "clob-1",
                status: "LIVE",
                side: "BUY",
                outcome: "Yes",
                original_size: "2",
                size_matched: "0",
                price: "0.55",
                created_at: new Date().toISOString(),
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

    cy.get("[data-cy=clob-orders]").should("be.visible");
    cy.get("[data-cy=clob-orders-list]").should("be.visible");
    cy.get("[data-cy=clob-order-clob-1]").should("be.visible");
  });
});
