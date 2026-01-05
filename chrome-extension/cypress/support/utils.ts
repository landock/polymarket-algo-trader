export const mockPolymarket = () => {
  cy.intercept("GET", "https://polymarket.com/**", {
    statusCode: 200,
    headers: { "content-type": "text/html" },
    body: "<html><body><div id='app'></div></body></html>",
  });
};

export const getExtensionId = () => {
  return cy
    .get("#polymarket-algo-extension")
    .invoke("attr", "data-extension-id")
    .should("match", /^[a-p]{32}$/);
};

export const stubRuntimeMessages = (
  handler: (message: any) => { success: boolean; data?: any; error?: string }
) => {
  cy.window().then((win) => {
    const chromeAny = win.chrome as any;
    if (!chromeAny?.runtime?.sendMessage) return;
    chromeAny.runtime.sendMessage = (message: any, callback?: (response: any) => void) => {
      const response = handler(message);
      if (callback) callback(response);
      return true;
    };
  });
};
