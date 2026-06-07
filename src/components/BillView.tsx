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
    return new Date(y, (mm || 1) - 1, dd).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
  }
  return new Date(y, (mm || 1) - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
};

function getLegacyNumber(obj: unknown, key: string): number | undefined {
  if (typeof obj !== "object" || obj === null) return undefined;
  const value = (obj as Record<string, unknown>)[key];
  return typeof value === "number" ? value : undefined;
}

export const BillView = forwardRef<HTMLDivElement, Props>(({ bill }, ref) => {
  const sym = bill.tariff.currencySymbol || "₹";
  const c = bill.calculation;
  const energyCharge = c.energyCharge ?? getLegacyNumber(c, "energyCharges") ?? 0;
  const interestOnED = c.interestOnED ?? 0;
  const surcharge = c.surcharge ?? 0;
  const lossGain = c.lossGain ?? 0;
  const extras = Array.isArray(c.extras)
    ? c.extras.filter((e) => e.label.trim().toLowerCase() !== "electricity duty")
    : [];
  const lossGainLabel = lossGain > 0 ? "Loss (Debit)" : "Gain (Credit)";

  return (
    <div ref={ref} className="bill-paper mx-auto w-full max-w-[760px] overflow-hidden rounded-2xl bg-white shadow-lg">
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
                Electricity Statement
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
        <Cell label="Consumer Name" value={bill.tenantName} />
        <Cell label="Meter ID" value={bill.meterId || "—"} mono />
        <Cell label="Billing Cycle" value={fmtMonth(bill.billingMonth)} />
        <Cell label="Due Date" value={fmtDate(bill.dueDate)} />
        <Cell
          label="Payment Status"
          value={bill.paymentStatus === "paid" ? "PAID" : "UNPAID"}
          tone={bill.paymentStatus === "paid" ? "success" : "warning"}
        />
      </div>

      {/* Account Summary if there is previous bill history */}
      {bill.previousBillMonth && (
        <div className="border-b border-paper-line bg-secondary/15 px-5 py-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-ink-muted uppercase tracking-wider text-[9px]">Previous Bill:</span>
              <span className="font-semibold text-ink">{fmtMonth(bill.previousBillMonth)}</span>
              <span className="text-paper-line">|</span>
              <span className="font-mono-bill font-bold text-ink">{formatMoney(bill.previousBillAmount ?? 0, sym)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-ink-muted uppercase tracking-wider text-[9px]">Previous Status:</span>
              {bill.previousBillStatus === "paid" ? (
                <span className="rounded bg-success/15 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-success uppercase">Settled</span>
              ) : (
                <span className="rounded bg-warning/15 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-warning uppercase">Unpaid</span>
              )}
              {bill.arrears && bill.arrears > 0 ? (
                <span className="font-bold text-warning ml-1">(Arrears: {formatMoney(bill.arrears, sym)})</span>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Readings */}
      <div className="grid grid-cols-3 gap-px bg-paper-line border-b border-paper-line">
        <ReadingCell label="Previous" value={bill.previousReading} />
        <ReadingCell label="Present" value={bill.currentReading} highlight />
        <ReadingCell label="Usage" value={c.unitsConsumed} accent suffix=" kWh" />
      </div>

      {/* Bill Particulars */}
      <div className="bg-paper px-6 py-5">
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="font-display text-sm font-bold uppercase tracking-wider text-ink">
            Breakdown
          </h3>
          <span className="text-[11px] uppercase tracking-wider text-ink-muted">
            {c.categoryId || "Domestic"} · {formatUnits(c.totalUnits ?? c.unitsConsumed ?? 0)}
          </span>
        </div>
        <div className="grid gap-2 rounded-lg border border-paper-line bg-card px-4 py-4 font-mono-bill text-[12px]">
          {/* Energy Breakdown */}
          {c.breakdown && c.breakdown.length > 0 ? (
            <div className="mb-2 space-y-1 border-b border-paper-line pb-2">
              <div className="mb-1 text-[10px] uppercase tracking-wider text-ink-muted">Energy Breakdown</div>
              {c.breakdown.map((b, idx) => (
                <div key={idx} className="flex justify-between text-[11px]">
                  <span className="text-ink-muted">
                    {b.units} units @ {sym}{b.rate} ({b.from}{b.to ? `-${b.to}` : "+"})
                  </span>
                  <span className="font-semibold text-ink">{formatMoney(b.amount, sym)}</span>
                </div>
              ))}
              <div className="flex justify-between pt-1 font-bold">
                <span>Total Energy Charges</span>
                <span>{formatMoney(energyCharge, sym)}</span>
              </div>
            </div>
          ) : (
            <ChargeRow label="Energy Charges" value={energyCharge} sym={sym} />
          )}

          <ChargeRow label="Fixed Charges" value={c.fixedCharge ?? 0} sym={sym} />
          <ChargeRow label="Customer Charges" value={c.customerCharge ?? 0} sym={sym} />
          <ChargeRow label="Electricity Duty" value={c.electricityDuty ?? 0} sym={sym} />
          {interestOnED > 0 && (
            <ChargeRow label="Interest on ED" value={interestOnED} sym={sym} />
          )}
          {surcharge !== 0 && (
            <ChargeRow label="Surcharges" value={surcharge} sym={sym} />
          )}
          {lossGain !== 0 && (
            <ChargeRow label={lossGainLabel} value={lossGain} sym={sym} tone={lossGain < 0 ? "success" : undefined} />
          )}
          {extras.map((e) => (
            <ChargeRow key={e.id} label={e.label} value={e.amount} sym={sym} />
          ))}
          {c.lateFee > 0 && <ChargeRow label="Late Fee" value={c.lateFee} sym={sym} tone="warning" />}
          {c.arrears && c.arrears > 0 ? (
            <ChargeRow label="Arrears (Previous Dues)" value={c.arrears} sym={sym} tone="warning" />
          ) : null}
        </div>

        {/* Total */}
        <div className="mt-5 flex items-center justify-between rounded-xl bg-gradient-hero px-5 py-4 text-primary-foreground shadow-soft">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] opacity-80">Total Payable</div>
            <div className="text-[11px] opacity-75 uppercase tracking-wider">Due Date: {fmtDate(bill.dueDate)}</div>
          </div>
          <div className="font-display text-3xl font-bold text-accent">
            {formatMoney(c.total, sym)}
          </div>
        </div>

        {bill.notes && (
          <p className="mt-4 text-[11px] italic text-ink-muted leading-relaxed">Note: {bill.notes}</p>
        )}

        <div className="mt-6 border-t border-dashed border-paper-line pt-4 text-center text-[10px] uppercase tracking-[0.2em] text-ink-muted">
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
  let toneClass = "text-ink";
  if (tone === "success") toneClass = "text-success";
  else if (tone === "warning") toneClass = "text-warning";
  
  return (
    <div className="bg-white px-5 py-3">
      <div className="text-[10px] font-bold uppercase tracking-widest text-ink-muted opacity-60">{label}</div>
      <div className={`mt-0.5 text-sm font-bold ${toneClass} ${mono ? "font-mono-bill" : ""}`}>
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
  let rowClass = "bg-white";
  if (accent) rowClass = "bg-accent/5";
  else if (highlight) rowClass = "bg-secondary/20";
  
  return (
    <div className={`px-5 py-4 ${rowClass}`}>
      <div className="text-[10px] font-bold uppercase tracking-widest text-ink-muted opacity-60">{label} reading</div>
      <div className={`font-mono-bill text-xl font-bold ${accent ? "text-accent" : "text-ink"}`}>
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
  let toneClass = "text-ink";
  if (tone === "warning") toneClass = "text-warning";
  else if (tone === "success") toneClass = "text-success";
  
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-ink-muted/80">{label}</span>
      <span className={`font-bold ${toneClass}`}>
        {formatMoney(value, sym)}
      </span>
    </div>
  );
}
