import { useRef, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AP_DEFAULT_TARIFF,
  exportBackup,
  importBackup,
  loadTariff,
  saveTariff,
} from "@/lib/storage";
import type { ExtraCharge, Slab, TariffConfig } from "@/lib/types";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Sparkles, Save, Download, Upload } from "lucide-react";

const Tariff = () => {
  const [t, setT] = useState<TariffConfig>(loadTariff());
  const fileRef = useRef<HTMLInputElement>(null);

  const update = (patch: Partial<TariffConfig>) => setT((s) => ({ ...s, ...patch }));

  const updateSlab = (i: number, patch: Partial<Slab>) => {
    const slabs = t.slabs.map((s, idx) => (idx === i ? { ...s, ...patch } : s));
    update({ slabs });
  };

  const addSlab = () => {
    const last = t.slabs[t.slabs.length - 1];
    const from = last ? (last.to ?? last.from) + 1 : 1;
    update({ slabs: [...t.slabs, { from, to: from + 99, rate: 5 }] });
  };

  const removeSlab = (i: number) => update({ slabs: t.slabs.filter((_, idx) => idx !== i) });

  const updateExtra = (id: string, patch: Partial<ExtraCharge>) => {
    update({ extras: t.extras.map((e) => (e.id === id ? { ...e, ...patch } : e)) });
  };
  const addExtra = () => {
    update({
      extras: [...t.extras, { id: Math.random().toString(36).slice(2, 8), label: "Other", amount: 0 }],
    });
  };
  const removeExtra = (id: string) =>
    update({ extras: t.extras.filter((e) => e.id !== id) });

  const onSave = () => {
    // Basic validation
    for (const s of t.slabs) {
      if (s.rate < 0 || s.from < 1 || (s.to !== null && s.to < s.from)) {
        toast({ title: "Invalid slab", description: "Check from/to/rate values.", variant: "destructive" });
        return;
      }
    }
    saveTariff(t);
    toast({ title: "Tariff saved" });
  };

  const loadAP = () => {
    setT({ ...AP_DEFAULT_TARIFF });
    toast({ title: "Andhra Pradesh preset loaded", description: "Click Save to apply." });
  };

  const onExportBackup = () => {
    const payload = exportBackup();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `submetercalc-backup-${stamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: "Backup downloaded",
      description: `${payload.bills.length} bills · ${payload.tenants.length} tenants`,
    });
  };

  const onImportBackup = async (file: File) => {
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const result = importBackup(json, "merge");
      setT(loadTariff());
      toast({
        title: "Backup restored",
        description: `Merged ${result.bills} bills, ${result.tenants} tenants.`,
      });
    } catch (e) {
      toast({
        title: "Import failed",
        description: e instanceof Error ? e.message : "Invalid file",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container max-w-2xl px-4 pb-32 pt-6">
        <div className="flex items-end justify-between gap-2">
          <div>
            <h1 className="font-display text-2xl font-bold text-ink">Tariff Settings</h1>
            <p className="mt-1 text-sm text-ink-muted">Define slab rates and other charges.</p>
          </div>
          <Button variant="outline" onClick={loadAP} className="gap-1">
            <Sparkles className="h-4 w-4 text-accent" /> AP Preset
          </Button>
        </div>

        <Card className="mt-5 p-5 shadow-soft">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-ink-muted">Slab Rates</h2>
          <div className="mt-3 space-y-2">
            {t.slabs.map((s, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 rounded-lg bg-secondary p-2">
                <NumField
                  className="col-span-3"
                  label="From"
                  value={s.from}
                  onChange={(n) => updateSlab(i, { from: Number(n) || 0 })}
                />
                <NumField
                  className="col-span-3"
                  label="To"
                  value={s.to ?? ""}
                  placeholder="∞"
                  onChange={(n) => updateSlab(i, { to: n === "" ? null : Number(n) })}
                />
                <NumField
                  className="col-span-4"
                  label={`Rate (${t.currencySymbol}/unit)`}
                  value={s.rate}
                  step="0.01"
                  onChange={(n) => updateSlab(i, { rate: Number(n) || 0 })}
                />
                <button
                  onClick={() => removeSlab(i)}
                  className="col-span-2 mt-5 inline-flex items-center justify-center rounded-md text-ink-muted hover:text-destructive"
                  aria-label="Remove slab"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" className="mt-3 gap-1" onClick={addSlab}>
            <Plus className="h-4 w-4" /> Add Slab
          </Button>
        </Card>

        <Card className="mt-4 p-5 shadow-soft">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-ink-muted">Other Charges</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Fixed Meter Charge">
              <Input
                inputMode="decimal"
                value={t.fixedCharge}
                onChange={(e) => update({ fixedCharge: Number(e.target.value) || 0 })}
                className="font-mono-bill"
              />
            </Field>
            <Field label="Late Fee / day">
              <Input
                inputMode="decimal"
                value={t.lateFeePerDay}
                onChange={(e) => update({ lateFeePerDay: Number(e.target.value) || 0 })}
                className="font-mono-bill"
              />
            </Field>
            <Field label="Currency Symbol">
              <Input
                value={t.currencySymbol}
                onChange={(e) => update({ currencySymbol: e.target.value || "₹" })}
              />
            </Field>
          </div>

          <h3 className="mt-5 text-[11px] font-bold uppercase tracking-[0.2em] text-ink-muted">
            Extra Charges
          </h3>
          <div className="mt-2 space-y-2">
            {t.extras.map((e) => (
              <div key={e.id} className="grid grid-cols-12 gap-2 rounded-lg bg-secondary p-2">
                <Field className="col-span-7" label="Label">
                  <Input value={e.label} onChange={(ev) => updateExtra(e.id, { label: ev.target.value })} />
                </Field>
                <Field className="col-span-3" label="Amount">
                  <Input
                    inputMode="decimal"
                    value={e.amount}
                    onChange={(ev) => updateExtra(e.id, { amount: Number(ev.target.value) || 0 })}
                    className="font-mono-bill"
                  />
                </Field>
                <button
                  onClick={() => removeExtra(e.id)}
                  className="col-span-2 mt-5 inline-flex items-center justify-center rounded-md text-ink-muted hover:text-destructive"
                  aria-label="Remove charge"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" className="mt-3 gap-1" onClick={addExtra}>
            <Plus className="h-4 w-4" /> Add Charge
          </Button>
        </Card>

        <Card className="mt-4 p-5 shadow-soft">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-ink-muted">
            Backup & Restore
          </h2>
          <p className="mt-2 text-xs text-ink-muted">
            Export all bills, tenants, and tariff settings to a JSON file. Import it on another
            device to restore.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" className="gap-1" onClick={onExportBackup}>
              <Download className="h-4 w-4" /> Export Backup
            </Button>
            <Button variant="outline" className="gap-1" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4" /> Import Backup
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onImportBackup(f);
                e.target.value = "";
              }}
            />
          </div>
        </Card>

        <div className="sticky bottom-3 mt-5">
          <Button onClick={onSave} className="w-full gap-1 bg-gradient-accent text-accent-foreground shadow-accent">
            <Save className="h-4 w-4" /> Save Tariff
          </Button>
        </div>
      </main>
    </div>
  );
};

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <Label className="mb-1 block text-xs font-medium text-ink-muted">{label}</Label>
      {children}
    </label>
  );
}

function NumField({
  label,
  value,
  onChange,
  className = "",
  step,
  placeholder,
}: {
  label: string;
  value: number | string;
  onChange: (v: string) => void;
  className?: string;
  step?: string;
  placeholder?: string;
}) {
  return (
    <Field label={label} className={className}>
      <Input
        type="number"
        step={step}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="font-mono-bill"
      />
    </Field>
  );
}

export default Tariff;
