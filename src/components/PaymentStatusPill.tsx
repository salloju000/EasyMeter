import { CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { getBillStatus } from "@/lib/billStatus";
import type { Bill } from "@/lib/types";

export function PaymentStatusPill({ bill, now }: { bill: Bill; now?: Date }) {
  const status = getBillStatus(bill, now);

  if (status === "paid") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-success">
        <CheckCircle2 className="h-3 w-3" />
        Paid
      </span>
    );
  }

  if (status === "overdue") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-destructive">
        <AlertTriangle className="h-3 w-3" />
        Overdue
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-warning">
      <Clock className="h-3 w-3" />
      Pending
    </span>
  );
}
