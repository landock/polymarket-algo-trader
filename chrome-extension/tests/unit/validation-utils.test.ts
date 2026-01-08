import { describe, expect, test } from "bun:test";
import {
  isValidCentsInput,
  isValidDecimalInput,
  isValidPriceCents,
  isValidSize,
} from "../../src/shared/utils/validation";
import { MIN_ORDER_SIZE, MIN_PRICE_CENTS, MAX_PRICE_CENTS } from "../../src/shared/constants/polymarket";

describe("validation utils", () => {
  test("validates order size against minimum", () => {
    expect(isValidSize(MIN_ORDER_SIZE)).toBe(false);
    expect(isValidSize(MIN_ORDER_SIZE + 0.01)).toBe(true);
  });

  test("validates price cents range", () => {
    expect(isValidPriceCents(MIN_PRICE_CENTS)).toBe(true);
    expect(isValidPriceCents(MAX_PRICE_CENTS)).toBe(true);
    expect(isValidPriceCents(MIN_PRICE_CENTS - 1)).toBe(false);
    expect(isValidPriceCents(MAX_PRICE_CENTS + 1)).toBe(false);
  });

  test("validates decimal inputs", () => {
    expect(isValidDecimalInput("")).toBe(true);
    expect(isValidDecimalInput("12.34")).toBe(true);
    expect(isValidDecimalInput("12.34.56")).toBe(false);
  });

  test("validates cents inputs", () => {
    expect(isValidCentsInput("")).toBe(true);
    expect(isValidCentsInput("9")).toBe(true);
    expect(isValidCentsInput("99")).toBe(true);
    expect(isValidCentsInput("999")).toBe(false);
  });
});
