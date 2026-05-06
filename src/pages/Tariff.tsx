import { useRef, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  loadTariff,
  saveTariff,
} from "@/lib/storage";
import type { Slab, TariffConfig } from "@/lib/types";
import { TSSPDCL_DOMESTIC_2025_26 } from "@/lib/types";
import { toast } from "@/hooks/use-toast";
import {
  Plus,
  Trash2,
  Sparkles,
  Save,
  Zap,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

const Tariff = () => {
  const [t, setT] = useState<TariffConfig>(loadTariff());

  const update = (patch: Partial<TariffConfig>) => {
    setT((s) => {
      const next = { ...s, ...patch };
      saveTariff(next);
      return next;
    });
  };

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

  const clearSlabs = () => {
    update({ slabs: [] });
    toast({ title: "Automatic TSPDCL Active", description: "All changes applied instantly." });
  };

  const isAutomatic = t.slabs.length === 0;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      {/* Premium Header */}
      <div className="bg-gradient-hero py-12 text-primary-foreground shadow-lg">
        <div className="container max-w-4xl px-4 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/20 ring-1 ring-accent/40 backdrop-blur-md">
            <Zap className="h-8 w-8 text-accent" strokeWidth={2} />
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight">Tariff & System Settings</h1>
          <p className="mx-auto mt-3 max-w-md text-primary-foreground/70">
            Configure energy slabs and automated TSPDCL category rates.
          </p>
        </div>
      </div>

      <main className="container -mt-8 max-w-3xl px-4 pb-32">
        {/* Slab Editor Card */}
        <Card className="overflow-hidden border-none shadow-card ring-1 ring-paper-line">
          <div className="flex items-center justify-between bg-secondary/50 px-6 py-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-accent" />
              <h2 className="font-display text-lg font-bold text-ink">Energy Slabs</h2>
            </div>
            <Button
              variant={isAutomatic ? "secondary" : "outline"}
              size="sm"
              onClick={clearSlabs}
              className={`gap-1.5 transition-all ${isAutomatic ? "bg-accent/10 text-accent ring-1 ring-accent/20" : ""}`}
            >
              <Sparkles className={`h-3.5 w-3.5 ${isAutomatic ? "animate-pulse" : ""}`} />
              {isAutomatic ? "Automatic TSPDCL" : "Switch to Automatic"}
            </Button>
          </div>

          <div className="p-6">
            {isAutomatic ? (
              <div className="rounded-2xl border border-dashed border-accent/30 bg-accent/5 p-6 transition-all duration-500">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-soft">
                    <ShieldCheck className="h-6 w-6 text-success" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-ink">Official TSPDCL Logic Enabled</h3>
                    <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                      Billing automatically applies Telangana Domestic category-wise telescopic slabs based on units consumed.
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  {TSSPDCL_DOMESTIC_2025_26.categories.map((cat) => (
                    <div key={cat.id} className="group relative overflow-hidden rounded-xl bg-white/60 p-4 ring-1 ring-accent/10 transition-all hover:bg-white hover:shadow-soft">
                      <div className="absolute right-0 top-0 h-12 w-12 translate-x-4 translate-y-[-1rem] opacity-5 transition-transform group-hover:scale-110">
                        <Zap className="h-full w-full" />
                      </div>
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.1em] text-accent">{cat.label}</p>
                      <div className="space-y-1.5">
                        {cat.slabs.map((s, idx) => (
                          <div key={idx} className="flex justify-between text-[11px]">
                            <span className="text-ink-muted">{s.from}{s.to ? `-${s.to}` : "+"} units</span>
                            <span className="font-mono-bill font-bold text-ink">₹{s.rate.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {t.slabs.map((s, i) => (
                  <div key={i} className="group flex items-end gap-3 rounded-xl border border-paper-line bg-secondary/30 p-3 transition-all hover:bg-secondary/50">
                    <NumField
                      className="flex-1"
                      label="From"
                      value={s.from}
                      onChange={(n) => updateSlab(i, { from: Number(n) || 0 })}
                    />
                    <div className="mb-3 text-ink-muted opacity-30"><ArrowRight className="h-4 w-4" /></div>
                    <NumField
                      className="flex-1"
                      label="To"
                      value={s.to ?? ""}
                      placeholder="∞"
                      onChange={(n) => updateSlab(i, { to: n === "" ? null : Number(n) })}
                    />
                    <NumField
                      className="flex-1"
                      label={`Rate (${t.currencySymbol})`}
                      value={s.rate}
                      step="0.01"
                      onChange={(n) => updateSlab(i, { rate: Number(n) || 0 })}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSlab(i)}
                      className="mb-0.5 h-10 w-10 text-ink-muted hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="mt-2 w-full gap-2 border-dashed py-6 text-ink-muted hover:border-accent hover:text-accent" onClick={addSlab}>
                  <Plus className="h-4 w-4" /> Add Manual Slab
                </Button>
              </div>
            )}
          </div>
        </Card>
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
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center gap-1">
        <Label className="text-xs font-bold uppercase tracking-wider text-ink-muted/80">{label}</Label>
        {icon && <span className="text-ink-muted/40">{icon}</span>}
      </div>
      {children}
    </div>
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
        className="font-mono-bill bg-white"
      />
    </Field>
  );
}

export default Tariff;
