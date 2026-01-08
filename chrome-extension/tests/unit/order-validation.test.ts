import { describe, expect, test } from "bun:test";
import {
  formatValidationErrors,
  validateBalance,
  validateOrder,
} from "../../src/background/order-validation";

describe("order validation", () => {
  test("rejects invalid order inputs", () => {
    const result = validateOrder("", "BUY", 0, 0);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);

    const formatted = formatValidationErrors(result.errors);
    expect(formatted).toContain("tokenId:");
    expect(formatted).toContain("size:");
    expect(formatted).toContain("price:");
  });

  test("fails when balance is insufficient", () => {
    const buyResult = validateBalance("BUY", 10, 1.5, 10);
    expect(buyResult.isValid).toBe(false);
    expect(buyResult.errors[0]?.message).toContain("Insufficient USDC balance");

    const sellResult = validateBalance("SELL", 5, 0.2, 2);
    expect(sellResult.isValid).toBe(false);
    expect(sellResult.errors[0]?.message).toContain("Insufficient shares");
  });
});
