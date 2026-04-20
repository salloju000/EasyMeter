import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { calculateBill, formatMoney } from "@/lib/calc";
import {
  getBill,
  getLatestBillFor,
  loadTariff,
  loadTenants,
  saveBill,
  uid,
  upsertTenantFromBill,
} from "@/lib/storage";
import type { Bill, Tenant } from "@/lib/types";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, ChevronsUpDown, Sparkles, Users } from "lucide-react";

const todayISO = () => new Date().toISOString();
const localDateStr = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};
const addDaysISO = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
};

const NewBill = () => {
  const navigate = useNavigate();
  const { id: editId } = useParams();
  const isEdit = Boolean(editId);
  const tariff = useMemo(() => loadTariff(), []);
  const [tenants, setTenants] = useState<Tenant[]>(() => loadTenants());

  const existing = useMemo(() => (editId ? getBill(editId) : undefined), [editId]);

  const [tenantName, setTenantName] = useState(existing?.tenantName ?? "");
  const [meterId, setMeterId] = useState(existing?.meterId ?? "");
  const [phone, setPhone] = useState("");
  const [previousReading, setPreviousReading] = useState<string>(
    existing ? String(existing.previousReading) : ""
  );
  const [currentReading, setCurrentReading] = useState<string>(
    existing ? String(existing.currentReading) : ""
  );
  const [isRollover, setIsRollover] = useState(existing?.isRollover ?? false);
  const [maxReading, setMaxReading] = useState<string>(
    existing?.maxReading ? String(existing.maxReading) : "10000"
  );
  const [billingMonth, setBillingMonth] = useState(existing?.billingMonth ?? localDateStr());
  const [interestOnED, setInterestOnED] = useState<string>(
    existing ? String(existing.calculation.interestOnED) : "0"
  );
  const [surchargePerUnit, setSurchargePerUnit] = useState<string>(
    existing ? String(existing.calculation.surchargePerUnit ?? 0) : "0"
  );
  const [lossGainPercent, setLossGainPercent] = useState<string>(
    existing ? String(existing.calculation.lossGainPercent ?? 0) : "0"
  );
  const [dueDate, setDueDate] = useState(
    existing ? existing.dueDate.slice(0, 10) : addDaysISO(10).slice(0, 10)
  );
  const [paid, setPaid] = useState(existing?.paymentStatus === "paid");
  const [lateDays, setLateDays] = useState<string>("0");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [tenantPickerOpen, setTenantPickerOpen] = useState(false);

  // Prefill phone from saved tenant
  useEffect(() => {
    const t = tenants.find((x) => x.name.trim().toLowerCase() === tenantName.trim().toLowerCase());
    if (t?.phone && !phone) setPhone(t.phone);
    if (t?.meterId && !meterId) setMeterId(t.meterId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantName]);

  // Auto-fill previous reading from this tenant's last bill (only when creating).
  useEffect(() => {
    if (isEdit) return;
    if (!tenantName.trim()) return;
    const last = getLatestBillFor(tenantName);
    if (last && !previousReading) {
      setPreviousReading(String(last.currentReading));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantName]);

  const prev = Number(previousReading) || 0;
  const curr = Number(currentReading) || 0;
  const maxR = Number(maxReading) || 10000;

  const units = useMemo(() => {
    if (isRollover) return Math.max(0, Math.floor(maxR - prev + curr));
    return Math.max(0, Math.floor(curr - prev));
  }, [prev, curr, isRollover, maxR]);

  const preview = useMemo(
    () => calculateBill({ 
      totalUnits: units,
      contractedLoadKW: 1,
      daysLate: Number(lateDays) || 0,
      interestOnED: Number(interestOnED) || 0,
      surchargePerUnit: Number(surchargePerUnit) || 0,
      lossGainPercent: Number(lossGainPercent) || 0,
    }),
    [units, lateDays, interestOnED, surchargePerUnit, lossGainPercent]
  );

  const validationError = (): string | null => {
    if (!tenantName.trim()) return "Tenant name is required.";
    if (previousReading === "" || currentReading === "") return "Both readings are required.";
    if (Number.isNaN(prev) || Number.isNaN(curr)) return "Readings must be numbers.";
    if (prev < 0 || curr < 0) return "Readings cannot be negative.";
    if (curr < prev && !isRollover) {
      return "Current reading cannot be less than previous (enable Rollover to override).";
    }
    if (isRollover && maxR <= prev) {
      return "Max reading must be greater than previous reading.";
    }
    return null;
  };

  const onSubmit = () => {
    const err = validationError();
    if (err) {
      toast({ title: "Check your inputs", description: err, variant: "destructive" });
      return;
    }
    upsertTenantFromBill(tenantName, meterId.trim() || undefined, phone.trim() || undefined);
    setTenants(loadTenants());

    const bill: Bill = {
      id: existing?.id ?? uid(),
      tenantName: tenantName.trim(),
      meterId: meterId.trim() || undefined,
      previousReading: prev,
      currentReading: curr,
      billingMonth,
      billingDate: existing?.billingDate ?? todayISO(),
      // Use noon to avoid timezone day-shift
      dueDate: new Date(`${dueDate}T12:00:00`).toISOString(),
      paymentStatus: paid ? "paid" : "unpaid",
      tariff,
      calculation: preview,
      notes: notes.trim() || undefined,
      isRollover,
      maxReading: isRollover ? maxR : undefined,
      createdAt: existing?.createdAt ?? todayISO(),
    };
    saveBill(bill);
    toast({
      title: isEdit ? "Bill updated" : "Bill generated",
      description: `${bill.tenantName} · ${formatMoney(preview.total)}`,
    });
    navigate(`/bill/${bill.id}`);
  };

  const pickTenant = (t: Tenant) => {
    setTenantName(t.name);
    setMeterId(t.meterId ?? "");
    setPhone(t.phone ?? "");
    setTenantPickerOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container max-w-2xl px-4 pb-24 pt-6">
        <button
          onClick={() => navigate(-1)}
          className="mb-3 inline-flex items-center gap-1 text-xs text-ink-muted hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>

        <h1 className="font-display text-2xl font-bold text-ink">
          {isEdit ? "Edit Bill" : "New Bill"}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          {isEdit
            ? "Update tenant info or readings — calculation refreshes live."
            : "Enter tenant info and meter readings. Slab calculation runs live."}
        </p>

        {/* Tenant */}
        <Card className="mt-5 space-y-4 p-5 shadow-soft">
          <SectionTitle>Tenant & Meter</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tenant Name *">
              <div className="flex gap-1">
                <Input
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  placeholder="e.g. Ravi Kumar"
                  className="flex-1"
                />
                {tenants.length > 0 && (
                  <Popover open={tenantPickerOpen} onOpenChange={setTenantPickerOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="icon" type="button" aria-label="Pick saved tenant">
                        <Users className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[260px] p-0" align="end">
                      <Command>
                        <CommandInput placeholder="Search tenants..." />
                        <CommandList>
                          <CommandEmpty>No saved tenants.</CommandEmpty>
                          <CommandGroup>
                            {tenants.map((t) => (
                              <CommandItem key={t.id} value={t.name} onSelect={() => pickTenant(t)}>
                                <span className="flex-1 truncate">{t.name}</span>
                                {t.meterId && (
                                  <span className="ml-2 font-mono-bill text-[10px] text-ink-muted">
                                    {t.meterId}
                                  </span>
                                )}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </Field>
            <Field label="Phone (optional, for WhatsApp)">
              <Input
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 9876543210"
                className="font-mono-bill"
              />
            </Field>
            <Field label="Meter ID (optional)">
              <Input value={meterId} onChange={(e) => setMeterId(e.target.value)} placeholder="e.g. SM-2231" />
            </Field>
            <Field label="Billing Date">
              <Input type="date" value={billingMonth} onChange={(e) => setBillingMonth(e.target.value)} min="2020-01-01" max="2035-12-31" />
            </Field>
          </div>
        </Card>

        {/* Readings */}
        <Card className="mt-4 space-y-4 p-5 shadow-soft">
          <SectionTitle>Meter Readings</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Previous Reading *">
              <Input
                inputMode="decimal"
                value={previousReading}
                onChange={(e) => setPreviousReading(e.target.value)}
                placeholder="0"
                className="font-mono-bill"
              />
            </Field>
            <Field label="Current Reading *">
              <Input
                inputMode="decimal"
                value={currentReading}
                onChange={(e) => setCurrentReading(e.target.value)}
                placeholder="0"
                className="font-mono-bill"
              />
            </Field>
          </div>

          {(curr < prev || isRollover) && (
            <div className="animate-fade-in space-y-3 rounded-lg border border-warning/20 bg-warning/5 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-bold text-warning">Meter Rollover / Reset</Label>
                  <p className="text-[10px] text-ink-muted">Enable if meter reached max and reset to zero.</p>
                </div>
                <Switch checked={isRollover} onCheckedChange={setIsRollover} />
              </div>
              {isRollover && (
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Max Meter Reading">
                    <Input
                      inputMode="numeric"
                      value={maxReading}
                      onChange={(e) => setMaxReading(e.target.value)}
                      placeholder="10000"
                      className="h-8 font-mono-bill text-xs"
                    />
                  </Field>
                </div>
              )}
            </div>
          )}
          <div className="rounded-xl bg-gradient-hero p-4 text-primary-foreground">
            <div className="text-[10px] uppercase tracking-[0.2em] opacity-80">Units Consumed</div>
            <div className="font-mono-bill text-3xl font-bold text-accent">
              {units.toLocaleString("en-IN")}{" "}
              <span className="text-sm font-medium opacity-80">kWh</span>
            </div>
          </div>
        </Card>

        {/* Additional Charges */}
        <Card className="mt-4 space-y-4 p-5 shadow-soft">
          <SectionTitle>Additional Charges</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Interest on ED (₹)">
              <Input
                inputMode="decimal"
                value={interestOnED}
                onChange={(e) => setInterestOnED(e.target.value)}
                placeholder="0"
                className="font-mono-bill"
                title="Direct amount for interest on overdue Electricity Duty arrears"
              />
            </Field>
            <Field label="Surcharge (₹/unit)">
              <Input
                inputMode="decimal"
                value={surchargePerUnit}
                onChange={(e) => setSurchargePerUnit(e.target.value)}
                placeholder="0"
                className="font-mono-bill"
                title="Per-unit surcharge rate"
              />
            </Field>
            <Field label="Loss/Gain (%)">
              <Input
                inputMode="decimal"
                value={lossGainPercent}
                onChange={(e) => setLossGainPercent(e.target.value)}
                placeholder="0"
                className="font-mono-bill"
                title="% on (Energy + Fixed + Surcharge). Positive = extra debit, Negative = credit"
              />
            </Field>
          </div>
        </Card>

        {/* Payment */}
        <Card className="mt-4 space-y-4 p-5 shadow-soft">
          <SectionTitle>Payment</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Due Date">
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} min="2020-01-01" max="2035-12-31" />
            </Field>
            <Field label="Late Days (optional)">
              <Input
                inputMode="numeric"
                value={lateDays}
                onChange={(e) => setLateDays(e.target.value)}
                className="font-mono-bill"
              />
            </Field>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-secondary px-4 py-3">
            <div>
              <Label className="text-sm font-medium text-ink">Mark as Paid</Label>
              <p className="text-xs text-ink-muted">Toggle if tenant has already paid.</p>
            </div>
            <Switch checked={paid} onCheckedChange={setPaid} />
          </div>
          <Field label="Notes (optional)">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. AC usage in summer..."
              rows={2}
            />
          </Field>
        </Card>

        <Card className="mt-4 flex items-center justify-between gap-3 bg-paper p-4">
          <div className="flex items-center gap-2 text-sm text-ink-muted">
            <Sparkles className="h-4 w-4 text-accent" />
            Estimated total
          </div>
          <div className="font-mono-bill text-2xl font-bold text-ink">
            {formatMoney(preview.total, tariff.currencySymbol)}
          </div>
        </Card>

        <div className="sticky bottom-3 mt-5 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button
            className="flex-1 bg-gradient-accent text-accent-foreground shadow-accent hover:opacity-95"
            onClick={onSubmit}
          >
            {isEdit ? "Save Changes" : "Generate Bill"}
            <ChevronsUpDown className="ml-1 hidden h-4 w-4" />
          </Button>
        </div>
      </main>
    </div>
  );
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-ink-muted">{children}</h2>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink-muted">{label}</span>
      {children}
    </label>
  );
}

export default NewBill;
