import { describe, expect, test } from "bun:test";
import {
  calculatePortfolioMetrics,
  calculatePositionBreakdown,
} from "../../src/background/portfolio-service";

describe("portfolio service", () => {
  test("calculates portfolio metrics with order history", () => {
    const positions = [
      {
        asset: "token-1",
        title: "Market 1",
        outcome: "Yes",
        size: 10,
        currentValue: 12,
        cashPnl: 2,
        percentPnl: 20,
        initialValue: 10,
      },
      {
        asset: "token-2",
        title: "Market 2",
        outcome: "No",
        size: 5,
        currentValue: 4,
        cashPnl: -1,
        percentPnl: -20,
        initialValue: 5,
      },
    ] as any[];

    const orderHistory = [
      {
        tokenId: "token-1",
        side: "BUY",
        size: 10,
        price: 0.4,
        status: "EXECUTED",
      },
      {
        tokenId: "token-1",
        side: "SELL",
        size: 5,
        price: 0.6,
        status: "EXECUTED",
      },
    ] as any[];

    const metrics = calculatePortfolioMetrics(positions, orderHistory);

    expect(metrics.totalValue).toBe(16);
    expect(metrics.unrealizedPnL).toBe(1);
    expect(metrics.realizedPnL).toBeCloseTo(-1);
    expect(metrics.totalPnL).toBeCloseTo(0);
    expect(metrics.totalVolume).toBeCloseTo(7);
    expect(metrics.positionCount).toBe(2);
  });

  test("sorts position breakdown by portfolio percentage", () => {
    const positions = [
      {
        asset: "token-1",
        title: "Market 1",
        outcome: "Yes",
        size: 10,
        currentValue: 12,
        cashPnl: 2,
        percentPnl: 20,
        initialValue: 10,
      },
      {
        asset: "token-2",
        title: "Market 2",
        outcome: "No",
        size: 5,
        currentValue: 4,
        cashPnl: -1,
        percentPnl: -20,
        initialValue: 5,
      },
    ] as any[];

    const breakdown = calculatePositionBreakdown(positions);

    expect(breakdown[0]?.tokenId).toBe("token-1");
    expect(breakdown[1]?.tokenId).toBe("token-2");
    expect(breakdown[0]?.percentOfPortfolio).toBeGreaterThan(
      breakdown[1]?.percentOfPortfolio ?? 0
    );
  });
});
