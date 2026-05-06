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
import { 
  ArrowLeft, 
  Zap, 
  Users, 
  Calendar, 
  ChevronRight, 
  ShieldCheck, 
  Sparkles,
  Smartphone,
  Hash,
  AlertTriangle,
  History,
  FileText,
  Save
} from "lucide-react";

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
  const tariff = loadTariff();
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

  useEffect(() => {
    const t = tenants.find((x) => x.name.trim().toLowerCase() === tenantName.trim().toLowerCase());
    if (t?.phone && !phone) setPhone(t.phone);
    if (t?.meterId && !meterId) setMeterId(t.meterId);
  }, [tenantName, tenants, phone, meterId]);

  useEffect(() => {
    if (isEdit) return;
    if (!tenantName.trim()) return;
    const last = getLatestBillFor(tenantName);
    if (last && !previousReading) {
      setPreviousReading(String(last.currentReading));
    }
  }, [tenantName, isEdit, previousReading]);

  const prev = Number(previousReading) || 0;
  const curr = Number(currentReading) || 0;
  const maxR = Number(maxReading) || 10000;

  const units = useMemo(() => {
    if (isRollover) return Math.max(0, Math.floor(maxR - prev + curr));
    return Math.max(0, Math.floor(curr - prev));
  }, [prev, curr, isRollover, maxR]);

  const preview = useMemo(() => {
    if (previousReading === "" || currentReading === "") {
      return {
        energyCharge: 0,
        fixedCharge: 0,
        customerCharge: 0,
        electricityDuty: 0,
        interestOnED: 0,
        surcharge: 0,
        lossGain: 0,
        lateFee: 0,
        total: 0,
        unitsConsumed: 0,
        breakdown: [],
      } as any;
    }
    return calculateBill({ 
      totalUnits: units,
      contractedLoadKW: 1,
      daysLate: Number(lateDays) || 0,
      interestOnED: Number(interestOnED) || 0,
      surchargePerUnit: Number(surchargePerUnit) || 0,
      lossGainPercent: Number(lossGainPercent) || 0,
    }, tariff);
  }, [units, lateDays, interestOnED, surchargePerUnit, lossGainPercent, tariff, previousReading, currentReading]);

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
      toast({ title: "Incomplete Details", description: err, variant: "destructive" });
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
      description: `Invoice for ${bill.tenantName} ready.`,
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
      
      {/* Premium Header */}
      <div className="bg-gradient-hero py-10 text-primary-foreground shadow-lg">
        <div className="container max-w-4xl px-4">
          <button
            onClick={() => navigate(-1)}
            className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider opacity-60 transition-opacity hover:opacity-100"
          >
            <ArrowLeft className="h-4 w-4" /> Back to dashboard
          </button>
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-accent/20 ring-1 ring-accent/40 backdrop-blur-md">
              <Zap className="h-7 w-7 text-accent" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight">
                {isEdit ? "Update Invoice" : "Generate Bill"}
              </h1>
              <p className="text-sm text-primary-foreground/70">
                Drafting official electricity statement for {tenantName || "registered tenant"}.
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="container -mt-8 max-w-4xl px-4 pb-32">
        <div className="grid gap-6 lg:grid-cols-12">
          
          <div className="space-y-6 lg:col-span-8">
            {/* Tenant Selection Card */}
            <Card className="overflow-hidden border-none shadow-card ring-1 ring-paper-line">
              <div className="flex items-center justify-between bg-secondary/50 px-6 py-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-accent" />
                  <h2 className="font-display text-lg font-bold text-ink">Entity Identification</h2>
                </div>
                {tenants.length > 0 && (
                  <Popover open={tenantPickerOpen} onOpenChange={setTenantPickerOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className="gap-1.5 text-accent hover:bg-accent/10">
                        <History className="h-3.5 w-3.5" /> Choose Saved
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[280px] p-0" align="end">
                      <Command>
                        <CommandInput placeholder="Search active tenants..." />
                        <CommandList>
                          <CommandEmpty>Profile not found.</CommandEmpty>
                          <CommandGroup>
                            {tenants.map((t) => (
                              <CommandItem key={t.id} value={t.name} onSelect={() => pickTenant(t)} className="flex items-center justify-between py-3">
                                <div className="min-w-0 flex-1">
                                  <div className="truncate font-bold text-ink">{t.name}</div>
                                  <div className="text-[10px] text-ink-muted">{t.meterId || "No Meter ID"}</div>
                                </div>
                                <ChevronRight className="h-4 w-4 text-ink-muted/30" />
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
              <div className="p-6">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Tenant Full Name *">
                    <Input
                      value={tenantName}
                      onChange={(e) => setTenantName(e.target.value)}
                      placeholder="e.g. Rajesh Kumar"
                      className="h-12 bg-white"
                    />
                  </Field>
                  <Field label="Contact Number" icon={<Smartphone className="h-3 w-3" />}>
                    <Input
                      inputMode="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="WhatsApp enabled"
                      className="h-12 font-mono-bill"
                    />
                  </Field>
                  <Field label="Meter ID Reference" icon={<Hash className="h-3 w-3" />}>
                    <Input 
                      value={meterId} 
                      onChange={(e) => setMeterId(e.target.value)} 
                      placeholder="e.g. SM-A02" 
                      className="h-12"
                    />
                  </Field>
                  <Field label="Statement Period">
                    <Input 
                      type="date" 
                      value={billingMonth} 
                      onChange={(e) => setBillingMonth(e.target.value)} 
                      className="h-12"
                    />
                  </Field>
                </div>
              </div>
            </Card>

            {/* Meter Reading Card */}
            <Card className="overflow-hidden border-none shadow-card ring-1 ring-paper-line">
              <div className="bg-secondary/50 px-6 py-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-accent" />
                  <h2 className="font-display text-lg font-bold text-ink">Meter Diagnostics</h2>
                </div>
              </div>
              <div className="p-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-6">
                    <Field label="Previous reading">
                      <Input
                        inputMode="decimal"
                        value={previousReading}
                        onChange={(e) => setPreviousReading(e.target.value)}
                        placeholder="0.00"
                        className="h-14 text-xl font-bold font-mono-bill bg-secondary/20"
                      />
                    </Field>
                    <Field label="Present reading">
                      <Input
                        inputMode="decimal"
                        value={currentReading}
                        onChange={(e) => setCurrentReading(e.target.value)}
                        placeholder="0.00"
                        className="h-14 text-xl font-bold font-mono-bill bg-secondary/20 focus-visible:bg-white"
                      />
                    </Field>
                  </div>
                  
                  <div className="flex flex-col">
                    <div className="flex-1 rounded-2xl bg-gradient-hero p-6 text-primary-foreground shadow-accent ring-1 ring-white/10">
                      <div className="flex items-center justify-between opacity-70">
                        <span className="text-[10px] font-bold uppercase tracking-widest">Net Consumption</span>
                        <Zap className="h-4 w-4" />
                      </div>
                      <div className="mt-4 flex items-baseline gap-2">
                        <span className="font-mono-bill text-5xl font-bold text-accent">
                          {units.toLocaleString("en-IN")}
                        </span>
                        <span className="text-sm font-medium opacity-60 uppercase">Units</span>
                      </div>
                      <div className="mt-6 border-t border-white/10 pt-4">
                        <p className="text-[10px] leading-relaxed opacity-60 uppercase tracking-wider">
                          Auto-calculated based on {isRollover ? "meter rollover logic" : "linear subtraction"}.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {(curr < prev || isRollover) && (
                  <div className="mt-6 rounded-2xl border border-dashed border-warning/30 bg-warning/5 p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex gap-3">
                        <div className="mt-1"><AlertTriangle className="h-5 w-5 text-warning" /></div>
                        <div>
                          <h3 className="text-sm font-bold text-ink">Rollover Detected</h3>
                          <p className="text-xs text-ink-muted">Meter value reset or flipped. Enable override below.</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Label className="text-xs font-bold text-ink-muted uppercase tracking-widest">Active</Label>
                        <Switch checked={isRollover} onCheckedChange={setIsRollover} />
                      </div>
                    </div>
                    {isRollover && (
                      <div className="mt-4 pt-4 border-t border-warning/10">
                        <Field label="Max Meter Value (Limit)">
                          <Input
                            inputMode="numeric"
                            value={maxReading}
                            onChange={(e) => setMaxReading(e.target.value)}
                            placeholder="10000"
                            className="h-10 font-mono-bill bg-white"
                          />
                        </Field>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>

            {/* Financial Adjustments Card */}
            <Card className="overflow-hidden border-none shadow-card ring-1 ring-paper-line">
              <div className="bg-secondary/50 px-6 py-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-accent" />
                  <h2 className="font-display text-lg font-bold text-ink">Surcharges & Adjustments</h2>
                </div>
              </div>
              <div className="p-6">
                <div className="grid gap-5 sm:grid-cols-3">
                  <Field label="Interest on ED (₹)">
                    <Input
                      inputMode="decimal"
                      value={interestOnED}
                      onChange={(e) => setInterestOnED(e.target.value)}
                      className="h-11 font-mono-bill bg-white"
                    />
                  </Field>
                  <Field label="Surcharge (₹/unit)">
                    <Input
                      inputMode="decimal"
                      value={surchargePerUnit}
                      onChange={(e) => setSurchargePerUnit(e.target.value)}
                      className="h-11 font-mono-bill bg-white"
                    />
                  </Field>
                  <Field label="Loss/Gain (%)">
                    <Input
                      inputMode="decimal"
                      value={lossGainPercent}
                      onChange={(e) => setLossGainPercent(e.target.value)}
                      className="h-11 font-mono-bill bg-white"
                    />
                  </Field>
                </div>
              </div>
            </Card>
          </div>

          {/* Sidebar / Status Column */}
          <div className="space-y-6 lg:col-span-4">
            {/* Live Preview Card */}
            <Card className="sticky top-20 p-6 border-none shadow-card ring-1 ring-paper-line bg-gradient-paper">
              <div className="mb-6 flex items-center gap-2 text-ink-muted">
                <Sparkles className="h-4 w-4 text-accent" />
                <span className="text-xs font-bold uppercase tracking-widest">Real-time Preview</span>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-ink-muted">Energy Charge</span>
                  <span className="font-bold text-ink">{formatMoney(preview.energyCharge)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-ink-muted">Fixed Charges</span>
                  <span className="font-bold text-ink">{formatMoney(preview.fixedCharge)}</span>
                </div>
                {preview.customerCharges > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-ink-muted">Surcharges</span>
                    <span className="font-bold text-ink">{formatMoney(preview.customerCharges)}</span>
                  </div>
                )}
                <div className="my-4 border-t border-dashed border-paper-line" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-muted mb-1">Invoice Total</span>
                  <span className="font-mono-bill text-4xl font-bold text-ink">
                    {formatMoney(preview.total, tariff.currencySymbol)}
                  </span>
                </div>
              </div>

              <div className="mt-8 space-y-4">
                <Field label="Final Due Date">
                  <Input 
                    type="date" 
                    value={dueDate} 
                    onChange={(e) => setDueDate(e.target.value)} 
                    className="h-11 bg-white font-bold"
                  />
                </Field>
                
                <div className="flex items-center justify-between rounded-2xl bg-white p-4 ring-1 ring-paper-line shadow-soft transition-all">
                  <div>
                    <Label className="text-xs font-bold uppercase tracking-wider text-ink">Paid Status</Label>
                    <p className="text-[10px] text-ink-muted">Payment received in full</p>
                  </div>
                  <Switch checked={paid} onCheckedChange={setPaid} className="data-[state=checked]:bg-success" />
                </div>
              </div>

              <div className="mt-8 grid gap-3">
                <Button 
                  onClick={onSubmit} 
                  className="group h-14 w-full gap-3 bg-gradient-accent text-lg font-bold text-accent-foreground shadow-accent active:scale-95 transition-all"
                >
                  <Save className="h-5 w-5 transition-transform group-hover:scale-110" /> 
                  {isEdit ? "Update Bill" : "Finalize & Save"}
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => navigate(-1)}
                  className="h-12 w-full text-ink-muted hover:bg-secondary/50"
                >
                  Discard Changes
                </Button>
              </div>
            </Card>

            <div className="p-4 rounded-2xl bg-secondary/30 ring-1 ring-paper-line">
              <Label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-ink-muted">Internal Remarks</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Remarks for internal records..."
                className="bg-transparent border-none resize-none text-xs focus-visible:ring-0"
                rows={3}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

function Field({
  label,
  children,
  className = "",
  icon,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center gap-1.5 px-1">
        {icon && <span className="text-accent">{icon}</span>}
        <Label className="text-[10px] font-bold uppercase tracking-[0.15em] text-ink-muted/80">{label}</Label>
      </div>
      {children}
    </div>
  );
}

export default NewBill;
