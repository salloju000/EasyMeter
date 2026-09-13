import { describe, it, expect } from "vitest";
import { getBillStatus } from "./billStatus";
import type { Bill } from "./types";

function makeBill(overrides: Partial<Bill>): Bill {
  return {
    id: "b1",
    tenantName: "Test Tenant",
    previousReading: 0,
    currentReading: 100,
    billingMonth: "2026-01",
    billingDate: "2026-01-01T00:00:00.000Z",
    dueDate: "2026-01-15T00:00:00.000Z",
    paymentStatus: "unpaid",
    tariff: { slabs: [], fixedCharge: 0, extras: [], currencySymbol: "₹", lateFeePerDay: 5 },
    calculation: {
      categoryId: "LT1A",
      totalUnits: 100,
      energyCharge: 0,
      fixedCharge: 0,
      customerCharge: 0,
      electricityDuty: 0,
      interestOnED: 0,
      surcharge: 0,
      lossGain: 0,
      lateFee: 0,
      total: 0,
    },
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("getBillStatus", () => {
  it("returns 'paid' when paymentStatus is paid, regardless of due date", () => {
    const bill = makeBill({ paymentStatus: "paid", dueDate: "2020-01-01T00:00:00.000Z" });
    expect(getBillStatus(bill, new Date("2026-06-01"))).toBe("paid");
  });

  it("returns 'pending' when unpaid and due date is in the future", () => {
    const bill = makeBill({ paymentStatus: "unpaid", dueDate: "2026-06-15T00:00:00.000Z" });
    expect(getBillStatus(bill, new Date("2026-06-01"))).toBe("pending");
  });

  it("returns 'overdue' when unpaid and due date is in the past", () => {
    const bill = makeBill({ paymentStatus: "unpaid", dueDate: "2026-05-01T00:00:00.000Z" });
    expect(getBillStatus(bill, new Date("2026-06-01"))).toBe("overdue");
  });

  it("treats the exact due-date instant as not yet overdue", () => {
    const bill = makeBill({ paymentStatus: "unpaid", dueDate: "2026-06-01T00:00:00.000Z" });
    expect(getBillStatus(bill, new Date("2026-06-01T00:00:00.000Z"))).toBe("pending");
  });
});
