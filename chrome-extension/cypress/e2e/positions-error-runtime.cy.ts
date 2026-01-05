import { stubRuntimeMessages } from "../support/utils";

describe("positions runtime error", () => {
  it("shows error when positions fetch fails", () => {
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
        case "GET_POSITIONS":
          return { success: false, error: "Failed to fetch positions" };
        default:
          return { success: true, data: [] };
      }
    });

    const privateKey = `0x${"1".repeat(64)}`;
    cy.get("[data-cy=import-private-key]", { timeout: 15000 }).type(privateKey);
    cy.get("[data-cy=import-password]").type("password123");
    cy.get("[data-cy=import-submit]").click();

    cy.get("[data-cy=positions-error]").should(
      "contain",
      "Failed to fetch positions"
    );
  });
});
