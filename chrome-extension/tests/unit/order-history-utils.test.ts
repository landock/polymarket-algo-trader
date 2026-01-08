import { describe, expect, test } from "bun:test";
import {
  buildOrderHistoryCsv,
  getOrderTypeLabel,
  getSortIcon,
} from "../../src/content/ui/order-history-utils";
import type { OrderHistoryEntry } from "../../src/shared/types";

describe("order history utils", () => {
  test("maps algo order types to labels", () => {
    const entry = {
      id: "1",
      tokenId: "token-1",
      orderType: "ALGO",
      algoType: "TRAILING_STOP",
      side: "BUY",
      size: 1,
      price: 0.5,
      status: "EXECUTED",
      timestamp: 1,
    } as OrderHistoryEntry;

    expect(getOrderTypeLabel(entry)).toBe("Trailing Stop");
    expect(getOrderTypeLabel({ ...entry, algoType: "CUSTOM" } as any)).toBe("CUSTOM");
    expect(getOrderTypeLabel({ ...entry, orderType: "LIMIT" } as any)).toBe("LIMIT");
  });

  test("returns sort icons based on active field", () => {
    expect(getSortIcon("price", "timestamp", "asc")).toBe("\u2195\uFE0F");
    expect(getSortIcon("price", "price", "asc")).toBe("\u2191");
    expect(getSortIcon("price", "price", "desc")).toBe("\u2193");
  });

  test("builds CSV with escaped values", () => {
    const orders = [
      {
        id: "1",
        tokenId: "token-1",
        orderType: "LIMIT",
        side: "BUY",
        size: 1,
        price: 0.5,
        status: "EXECUTED",
        timestamp: 1710000000000,
        marketQuestion: "Will, it \"rain\"?",
      },
    ] as OrderHistoryEntry[];

    const { csvContent, filename } = buildOrderHistoryCsv(orders);

    expect(csvContent.split("\n")[0]).toContain("Timestamp");
    expect(csvContent).toContain('"Will, it ""rain""?"');
    expect(filename.startsWith("polymarket-order-history-")).toBe(true);
    expect(filename.endsWith(".csv")).toBe(true);
  });
});
