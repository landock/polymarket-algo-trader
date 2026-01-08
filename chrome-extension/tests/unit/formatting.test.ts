import { describe, expect, test } from "bun:test";
import {
  formatAddress,
  formatCurrency,
  formatLiquidity,
  formatPercentage,
  formatPrice,
  formatShares,
  formatVolume,
} from "../../src/shared/utils/formatting";

describe("formatting utils", () => {
  test("formats addresses", () => {
    expect(formatAddress("0x1234567890abcdef")).toBe("0x1234...cdef");
  });

  test("formats prices and currency", () => {
    expect(formatPrice(0.456)).toBe("46\u00A2");
    expect(formatCurrency(12.3456)).toBe("$12.35");
    expect(formatCurrency(12.3, 1)).toBe("$12.3");
  });

  test("formats volume and liquidity", () => {
    expect(formatVolume(999)).toBe("$999");
    expect(formatVolume(1200)).toBe("$1.2K");
    expect(formatVolume(2_500_000)).toBe("$2.50M");

    expect(formatLiquidity(999)).toBe("$999");
    expect(formatLiquidity(1200)).toBe("$1K");
    expect(formatLiquidity(2_500_000)).toBe("$2.50M");
  });

  test("formats percentages and shares", () => {
    expect(formatPercentage(12.345)).toBe("12.3%");
    expect(formatPercentage(12.345, 2)).toBe("12.35%");
    expect(formatShares(1.2345)).toBe("1.23");
    expect(formatShares(1.2345, 3)).toBe("1.234");
  });
});
