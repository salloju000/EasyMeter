import { describe, it, expect } from "vitest";
import { getMonthlyConsumption, getMonthlyBilling, getTenantLeaderboard } from "./analytics";
import type { Bill } from "./types";

function makeBill(overrides: Partial<Bill> & { unitsConsumed: number; total: number }): Bill {
  const { unitsConsumed, total, ...rest } = overrides;
  return {
    id: rest.id ?? "b1",
    tenantName: rest.tenantName ?? "Tenant A",
    previousReading: 0,
    currentReading: unitsConsumed,
    billingMonth: rest.billingMonth ?? "2026-01",
    billingDate: "2026-01-01T00:00:00.000Z",
    dueDate: "2026-01-15T00:00:00.000Z",
    paymentStatus: rest.paymentStatus ?? "unpaid",
    tariff: { slabs: [], fixedCharge: 0, extras: [], currencySymbol: "₹", lateFeePerDay: 5 },
    calculation: {
      categoryId: "LT1A",
      totalUnits: unitsConsumed,
      energyCharge: 0,
      fixedCharge: 0,
      customerCharge: 0,
      electricityDuty: 0,
      interestOnED: 0,
      surcharge: 0,
      lossGain: 0,
      lateFee: 0,
      total,
      unitsConsumed,
    },
    createdAt: "2026-01-01T00:00:00.000Z",
    ...rest,
  };
}

describe("getMonthlyConsumption", () => {
  it("returns an empty array for no bills", () => {
    expect(getMonthlyConsumption([])).toEqual([]);
  });

  it("sums units per billing month and sorts chronologically", () => {
    const bills = [
      makeBill({ id: "1", billingMonth: "2026-02", unitsConsumed: 100, total: 500 }),
      makeBill({ id: "2", billingMonth: "2026-01", unitsConsumed: 80, total: 400 }),
      makeBill({ id: "3", billingMonth: "2026-01", unitsConsumed: 20, total: 100 }),
    ];
    expect(getMonthlyConsumption(bills)).toEqual([
      { month: "2026-01", units: 100 },
      { month: "2026-02", units: 100 },
    ]);
  });
});

describe("getMonthlyBilling", () => {
  it("splits billed amount into paid vs unpaid per month", () => {
    const bills = [
      makeBill({ id: "1", billingMonth: "2026-01", unitsConsumed: 50, total: 300, paymentStatus: "paid" }),
      makeBill({ id: "2", billingMonth: "2026-01", unitsConsumed: 50, total: 200, paymentStatus: "unpaid" }),
    ];
    expect(getMonthlyBilling(bills)).toEqual([{ month: "2026-01", paid: 300, unpaid: 200 }]);
  });
});

describe("getTenantLeaderboard", () => {
  it("ranks tenants by total units consumed, descending", () => {
    const bills = [
      makeBill({ id: "1", tenantName: "Alice", unitsConsumed: 50, total: 300 }),
      makeBill({ id: "2", tenantName: "Bob", unitsConsumed: 200, total: 900 }),
      makeBill({ id: "3", tenantName: "Alice", unitsConsumed: 30, total: 150 }),
    ];
    const leaderboard = getTenantLeaderboard(bills);
    expect(leaderboard).toEqual([
      { tenantName: "Bob", totalUnits: 200, totalAmount: 900, billCount: 1 },
      { tenantName: "Alice", totalUnits: 80, totalAmount: 450, billCount: 2 },
    ]);
  });
});
