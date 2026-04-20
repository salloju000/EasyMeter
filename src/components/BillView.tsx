import { forwardRef } from "react";
import type { Bill } from "@/lib/types";
import { formatMoney, formatUnits } from "@/lib/calc";
import { Zap } from "lucide-react";

interface Props {
  bill: Bill;
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

const fmtMonth = (m: string) => {
  const parts = m.split("-").map(Number);
  const [y, mm, dd] = parts;
  if (dd) {
    // Full date YYYY-MM-DD
    return new Date(y, (mm || 1) - 1, dd).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
  }
  // Legacy YYYY-MM
  return new Date(y, (mm || 1) - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
};

export const BillView = forwardRef<HTMLDivElement, Props>(({ bill }, ref) => {
  const sym = bill.tariff.currencySymbol || "₹";
  const c = bill.calculation;
  return (
    <div ref={ref} className="bill-paper mx-auto w-full max-w-[760px] overflow-hidden rounded-2xl">
      {/* Header band */}
      <div className="relative bg-gradient-hero px-6 py-5 text-primary-foreground">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent/20 ring-1 ring-accent/40">
              <Zap className="h-6 w-6 text-accent" strokeWidth={2.5} />
            </div>
            <div>
              <div className="font-display text-xl font-bold leading-tight">EasyMeter</div>
              <div className="text-[11px] uppercase tracking-[0.22em] opacity-80">
                Tenant Electricity Bill
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-widest opacity-75">Bill No.</div>
            <div className="font-mono-bill text-sm font-semibold">
              {bill.id.slice(0, 8).toUpperCase()}
            </div>
            <div className="mt-1 text-[11px] opacity-75">{fmtDate(bill.billingDate)}</div>
          </div>
        </div>
      </div>

      {/* Tenant + meta grid */}
      <div className="grid grid-cols-2 gap-px bg-paper-line">
        <Cell label="Consumer" value={bill.tenantName} />
        <Cell label="Meter ID" value={bill.meterId || "—"} mono />
        <Cell label="Billing Period" value={fmtMonth(bill.billingMonth)} />
        <Cell label="Due Date" value={fmtDate(bill.dueDate)} />
        <Cell
          label="Status"
          value={bill.paymentStatus === "paid" ? "PAID" : "UNPAID"}
          tone={bill.paymentStatus === "paid" ? "success" : "warning"}
        />
      </div>

      {/* Readings */}
      <div className="grid grid-cols-3 gap-px bg-paper-line">
        <ReadingCell label="Previous" value={bill.previousReading} />
        <ReadingCell label="Current" value={bill.currentReading} highlight />
        <ReadingCell label="Units" value={c.unitsConsumed} accent suffix=" kWh" />
      </div>

      {/* Bill Particulars */}
      <div className="bg-paper px-6 py-5">
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="font-display text-sm font-bold uppercase tracking-wider text-ink">
            Bill Particulars
          </h3>
          <span className="text-[11px] uppercase tracking-wider text-ink-muted">
            {c.categoryId || "Domestic"} · {formatUnits(c.totalUnits ?? c.unitsConsumed ?? 0)}
          </span>
        </div>
        <div className="grid gap-2 rounded-lg border border-paper-line bg-card px-4 py-4 font-mono-bill text-[12px]">
          <ChargeRow label="Energy Charges" value={c.energyCharge ?? (c as any).energyCharges ?? 0} sym={sym} />
          <ChargeRow label="Fixed Charges" value={c.fixedCharge ?? 0} sym={sym} />
          <ChargeRow label="Customer Charges" value={c.customerCharge ?? 0} sym={sym} />
          <ChargeRow label="Electricity Duty" value={c.electricityDuty ?? 0} sym={sym} />
          {((c as any).interestOnED ?? 0) > 0 && (
            <ChargeRow label="Interest on ED" value={(c as any).interestOnED} sym={sym} />
          )}
          {((c as any).surcharge ?? 0) !== 0 && (
            <ChargeRow label="Surcharges" value={(c as any).surcharge} sym={sym} />
          )}
          {((c as any).lossGain ?? 0) !== 0 && (
            <ChargeRow label={(c as any).lossGain > 0 ? "Loss (Debit)" : "Gain (Credit)"} value={(c as any).lossGain} sym={sym} tone={(c as any).lossGain < 0 ? "success" : undefined} />
          )}
          {(c as any).extras?.map((e: any) => (
            <ChargeRow key={e.id} label={e.label} value={e.amount} sym={sym} />
          ))}
          {c.lateFee > 0 && <ChargeRow label="Late Fee" value={c.lateFee} sym={sym} tone="warning" />}
        </div>

        {/* Total */}
        <div className="mt-5 flex items-center justify-between rounded-xl bg-gradient-hero px-5 py-4 text-primary-foreground shadow-soft">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] opacity-80">Total Payable</div>
            <div className="text-[11px] opacity-75">Pay before {fmtDate(bill.dueDate)}</div>
          </div>
          <div className="font-display text-3xl font-bold text-accent">
            {formatMoney(c.total, sym)}
          </div>
        </div>

        {bill.notes && (
          <p className="mt-4 text-[11px] italic text-ink-muted">Note: {bill.notes}</p>
        )}

        <div className="mt-5 border-t border-dashed border-paper-line pt-3 text-center text-[10px] uppercase tracking-widest text-ink-muted">
          Generated by EasyMeter · {fmtDate(bill.createdAt)}
        </div>
      </div>
    </div>
  );
});
BillView.displayName = "BillView";

function Cell({
  label,
  value,
  mono,
  tone,
}: {
  label: string;
  value: string;
  mono?: boolean;
  tone?: "success" | "warning";
}) {
  const toneClass =
    tone === "success"
      ? "text-success"
      : tone === "warning"
      ? "text-warning"
      : "text-ink";
  return (
    <div className="bg-paper px-5 py-3">
      <div className="text-[10px] uppercase tracking-widest text-ink-muted">{label}</div>
      <div className={`mt-0.5 text-sm font-semibold ${toneClass} ${mono ? "font-mono-bill" : ""}`}>
        {value}
      </div>
    </div>
  );
}

function ReadingCell({
  label,
  value,
  highlight,
  accent,
  suffix = "",
}: {
  label: string;
  value: number;
  highlight?: boolean;
  accent?: boolean;
  suffix?: string;
}) {
  return (
    <div className={`px-5 py-4 ${accent ? "bg-accent/15" : highlight ? "bg-secondary" : "bg-paper"}`}>
      <div className="text-[10px] uppercase tracking-widest text-ink-muted">{label} Reading</div>
      <div className={`font-mono-bill text-xl font-bold ${accent ? "text-primary" : "text-ink"}`}>
        {value.toLocaleString("en-IN")}{suffix}
      </div>
    </div>
  );
}

function ChargeRow({
  label,
  value,
  sym,
  tone,
}: {
  label: string;
  value: number;
  sym: string;
  tone?: "warning" | "success";
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-muted">{label}</span>
      <span className={`font-semibold ${tone === "warning" ? "text-warning" : tone === "success" ? "text-success" : "text-ink"}`}>
        {formatMoney(value, sym)}
      </span>
    </div>
  );
}
