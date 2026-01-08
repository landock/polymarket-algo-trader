import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { OrderHistoryEntry } from "../../src/shared/types";
import * as storageAdapterModule from "../../src/storage/storage-adapter";
import {
  clearOrderHistory,
  getFilteredOrderHistory,
  getOrderHistory,
  getOrderHistoryCount,
  getRecentOrderHistory,
  saveOrderToHistory,
  updateOrderHistoryEntry,
} from "../../src/storage/order-history";

const originalAdapter = {
  get: storageAdapterModule.storageAdapter.get,
  set: storageAdapterModule.storageAdapter.set,
  remove: storageAdapterModule.storageAdapter.remove,
  clear: storageAdapterModule.storageAdapter.clear,
  getAll: storageAdapterModule.storageAdapter.getAll,
};

let memoryStore: Record<string, unknown> = {};

beforeEach(() => {
  memoryStore = {};

  storageAdapterModule.storageAdapter.get = async (key) =>
    key in memoryStore ? (memoryStore[key] as any) : null;
  storageAdapterModule.storageAdapter.set = async (key, value) => {
    memoryStore[key] = value as unknown;
  };
  storageAdapterModule.storageAdapter.remove = async (key) => {
    delete memoryStore[key];
  };
  storageAdapterModule.storageAdapter.clear = async () => {
    memoryStore = {};
  };
  storageAdapterModule.storageAdapter.getAll = async () => ({ ...memoryStore });
});

afterEach(() => {
  storageAdapterModule.storageAdapter.get = originalAdapter.get;
  storageAdapterModule.storageAdapter.set = originalAdapter.set;
  storageAdapterModule.storageAdapter.remove = originalAdapter.remove;
  storageAdapterModule.storageAdapter.clear = originalAdapter.clear;
  storageAdapterModule.storageAdapter.getAll = originalAdapter.getAll;
});

const makeEntry = (id: string, timestamp: number): OrderHistoryEntry => ({
  id,
  tokenId: `token-${id}`,
  orderType: "LIMIT",
  side: "BUY",
  size: 1,
  price: 0.5,
  status: "EXECUTED",
  timestamp,
});

describe("order history storage", () => {
  test("stores newest entries first", async () => {
    await saveOrderToHistory(makeEntry("1", 1));
    await saveOrderToHistory(makeEntry("2", 2));

    const history = await getOrderHistory();
    expect(history[0]?.id).toBe("2");
    expect(history[1]?.id).toBe("1");
  });

  test("trims history to the max entry count", async () => {
    const entries = Array.from({ length: 1000 }, (_, index) =>
      makeEntry(`seed-${index}`, index)
    );
    memoryStore.order_history = entries;

    await saveOrderToHistory(makeEntry("overflow", 2000));

    const history = await getOrderHistory();
    expect(history.length).toBe(1000);
    expect(history[0]?.id).toBe("overflow");
  });

  test("filters and updates entries", async () => {
    await saveOrderToHistory({
      ...makeEntry("a", 10),
      side: "SELL",
      status: "FAILED",
    });
    await saveOrderToHistory(makeEntry("b", 20));

    const filtered = await getFilteredOrderHistory({
      side: "SELL",
      status: "FAILED",
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe("a");

    await updateOrderHistoryEntry("a", { status: "EXECUTED" });
    const updated = await getOrderHistory();
    expect(updated[1]?.status).toBe("EXECUTED");
  });

  test("returns counts and recent entries", async () => {
    await saveOrderToHistory(makeEntry("one", 1));
    await saveOrderToHistory(makeEntry("two", 2));

    expect(await getOrderHistoryCount()).toBe(2);
    const recent = await getRecentOrderHistory(1);
    expect(recent).toHaveLength(1);
    expect(recent[0]?.id).toBe("two");

    await clearOrderHistory();
    expect(await getOrderHistoryCount()).toBe(0);
  });
});
