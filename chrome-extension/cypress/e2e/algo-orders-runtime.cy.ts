import { stubRuntimeMessages } from "../support/utils";

describe("algo orders runtime messaging", () => {
  it("creates and manages algo orders", () => {
    cy.visit("/");

    const orders: any[] = [];

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
        case "CREATE_ALGO_ORDER": {
          const orderId = "order-abc";
          orders.push({
            id: orderId,
            type: message.order.type,
            status: "ACTIVE",
            tokenId: message.order.tokenId,
            side: message.order.side,
            size: message.order.size,
            createdAt: Date.now(),
          });
          return { success: true, orderId };
        }
        case "PAUSE_ALGO_ORDER":
          orders[0].status = "PAUSED";
          return { success: true };
        case "RESUME_ALGO_ORDER":
          orders[0].status = "ACTIVE";
          return { success: true };
        case "CANCEL_ALGO_ORDER":
          orders[0].status = "CANCELLED";
          return { success: true };
        default:
          return { success: true, data: [] };
      }
    });

    const privateKey = `0x${"1".repeat(64)}`;
    cy.get("[data-cy=import-private-key]", { timeout: 15000 }).type(privateKey);
    cy.get("[data-cy=import-password]").type("password123");
    cy.get("[data-cy=import-submit]").click();

    cy.get("[data-cy=create-algo-order]").click();
    cy.get("[data-cy=algo-order-form]").should("be.visible");

    cy.get("[data-cy=token-id]").type("token-yes");
    cy.get("[data-cy=order-size]").clear().type("1");
    cy.get("[data-cy=order-submit]").click();

    cy.get("[data-cy=order-preview]").should("be.visible");
    cy.get("[data-cy=order-preview-confirm]").click();

    cy.get("[data-cy=active-orders-list]").should("be.visible");
    cy.get("[data-cy=algo-order-pause-order-abc]").click();
    cy.get("[data-cy=algo-order-resume-order-abc]").click();
    cy.on("window:confirm", () => true);
    cy.get("[data-cy=algo-order-cancel-order-abc]").click();
  });
});
