import type { Bill } from "./types";
import { round2 } from "./calc";

export interface MonthlyConsumptionPoint {
  month: string; // YYYY-MM
  units: number;
}

export interface MonthlyBillingPoint {
  month: string; // YYYY-MM
  paid: number;
  unpaid: number;
}

export interface TenantLeaderboardEntry {
  tenantName: string;
  totalUnits: number;
  totalAmount: number;
  billCount: number;
}

function getYM(billingMonth: string): string {
  return billingMonth.slice(0, 7);
}

/** Groups bills by billing month and sums units consumed, sorted chronologically. */
export function getMonthlyConsumption(bills: Bill[]): MonthlyConsumptionPoint[] {
  const byMonth = new Map<string, number>();
  for (const bill of bills) {
    const month = getYM(bill.billingMonth);
    byMonth.set(month, (byMonth.get(month) ?? 0) + (bill.calculation.unitsConsumed ?? 0));
  }
  return Array.from(byMonth.entries())
    .map(([month, units]) => ({ month, units }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

/** Groups bills by billing month, splitting billed amount into paid vs. unpaid, sorted chronologically. */
export function getMonthlyBilling(bills: Bill[]): MonthlyBillingPoint[] {
  const byMonth = new Map<string, { paid: number; unpaid: number }>();
  for (const bill of bills) {
    const month = getYM(bill.billingMonth);
    const entry = byMonth.get(month) ?? { paid: 0, unpaid: 0 };
    if (bill.paymentStatus === "paid") {
      entry.paid += bill.calculation.total;
    } else {
      entry.unpaid += bill.calculation.total;
    }
    byMonth.set(month, entry);
  }
  return Array.from(byMonth.entries())
    .map(([month, { paid, unpaid }]) => ({ month, paid: round2(paid), unpaid: round2(unpaid) }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

/** Ranks tenants by total units consumed across all their bills, descending. */
export function getTenantLeaderboard(bills: Bill[]): TenantLeaderboardEntry[] {
  const byTenant = new Map<string, TenantLeaderboardEntry>();
  for (const bill of bills) {
    const key = bill.tenantName.trim();
    const entry = byTenant.get(key) ?? {
      tenantName: key,
      totalUnits: 0,
      totalAmount: 0,
      billCount: 0,
    };
    entry.totalUnits += bill.calculation.unitsConsumed ?? 0;
    entry.totalAmount = round2(entry.totalAmount + bill.calculation.total);
    entry.billCount += 1;
    byTenant.set(key, entry);
  }
  return Array.from(byTenant.values()).sort((a, b) => b.totalUnits - a.totalUnits);
}
