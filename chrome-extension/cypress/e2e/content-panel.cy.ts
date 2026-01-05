describe("content panel", () => {
  it("injects and toggles the panel", () => {
    cy.visit("/");

    cy.get("#polymarket-algo-extension", { timeout: 15000 }).should("exist");
    cy.get("[data-cy=algo-panel]", { timeout: 15000 }).should("be.visible");
    cy.get("[data-cy=algo-panel-body]", { timeout: 15000 }).should("be.visible");

    cy.get("[data-cy=algo-panel-header]").click();
    cy.get("[data-cy=algo-panel-body]").should("not.be.visible");

    cy.get("[data-cy=algo-panel-header]").click();
    cy.get("[data-cy=algo-panel-body]").should("be.visible");
  });
});
