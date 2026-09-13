import type { Bill } from "./types";

export type BillStatus = "paid" | "overdue" | "pending";

export function getBillStatus(bill: Bill, now: Date = new Date()): BillStatus {
  if (bill.paymentStatus === "paid") return "paid";
  return new Date(bill.dueDate) < now ? "overdue" : "pending";
}
