describe("wallet import validation", () => {
  it("shows validation errors for invalid input", () => {
    cy.visit("/");

    cy.get("[data-cy=import-private-key]", { timeout: 15000 }).type("0x123");
    cy.get("[data-cy=import-password]").type("short");
    cy.get("[data-cy=import-submit]").click();

    cy.get("[data-cy=wallet-error]").should(
      "contain",
      "Password must be at least 8 characters"
    );

    cy.get("[data-cy=import-password]").clear().type("longenough");
    cy.get("[data-cy=import-submit]").click();

    cy.get("[data-cy=wallet-error]").should(
      "contain",
      "Invalid private key format"
    );
  });
});
