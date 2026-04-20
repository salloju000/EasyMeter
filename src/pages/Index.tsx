import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { loadBills, deleteBill } from "@/lib/storage";
import type { Bill } from "@/lib/types";
import { formatMoney, formatUnits } from "@/lib/calc";
import { Plus, FileText, Trash2, Zap, IndianRupee, CheckCircle2, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const Index = () => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [toDelete, setToDelete] = useState<Bill | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    setBills(loadBills());
  }, []);

  const confirmDelete = () => {
    if (!toDelete) return;
    deleteBill(toDelete.id);
    setBills(loadBills());
    toast({ title: "Bill deleted" });
    setToDelete(null);
  };

  const totalCollected = bills
    .filter((b) => b.paymentStatus === "paid")
    .reduce((s, b) => s + b.calculation.total, 0);
  const pending = bills
    .filter((b) => b.paymentStatus === "unpaid")
    .reduce((s, b) => s + b.calculation.total, 0);
  const totalUnits = bills.reduce((s, b) => s + b.calculation.unitsConsumed, 0);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container max-w-3xl px-4 pb-28 pt-6">
        {/* Hero */}
        <section className="animate-fade-in">
          <div className="overflow-hidden rounded-2xl bg-gradient-hero p-5 text-primary-foreground shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-accent">
                  Effortless Billing
                </div>
                <h1 className="mt-1 font-display text-2xl font-bold leading-tight">
                  Professional electricity bills for your tenants.
                </h1>
                <p className="mt-2 text-sm opacity-85">
                  Automated slab calculations, PDF export, and easy WhatsApp sharing.
                </p>
              </div>
              <div className="hidden h-14 w-14 shrink-0 place-items-center rounded-xl bg-accent/20 ring-1 ring-accent/40 sm:grid">
                <Zap className="h-7 w-7 text-accent" strokeWidth={2.5} />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild size="lg" className="bg-accent text-accent-foreground shadow-accent hover:bg-accent/90">
                <Link to="/new">
                  <Plus className="mr-1 h-4 w-4" /> New Bill
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              >
                <Link to="/tariff">Tariff Settings</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="mt-5 grid grid-cols-3 gap-2 animate-slide-up">
          <Stat icon={<IndianRupee className="h-4 w-4" />} label="Collected" value={formatMoney(totalCollected)} tone="success" />
          <Stat icon={<Clock className="h-4 w-4" />} label="Pending" value={formatMoney(pending)} tone="warning" />
          <Stat icon={<Zap className="h-4 w-4" />} label="Total Units" value={formatUnits(totalUnits)} />
        </section>

        {/* History */}
        <section className="mt-7 animate-slide-up">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-ink">Recent Bills</h2>
            <span className="text-xs text-ink-muted">{bills.length} total</span>
          </div>

          {bills.length === 0 ? (
            <Card className="border-dashed bg-paper p-10 text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-secondary text-ink-muted">
                <FileText className="h-6 w-6" />
              </div>
              <p className="mt-3 font-medium text-ink">No bills yet</p>
              <p className="mt-1 text-sm text-ink-muted">Create your first sub-meter bill to get started.</p>
              <Button onClick={() => navigate("/new")} className="mt-4">
                <Plus className="mr-1 h-4 w-4" /> Create Bill
              </Button>
            </Card>
          ) : (
            <ul className="grid gap-2">
              {bills.map((b) => (
                <li key={b.id}>
                  <Link
                    to={`/bill/${b.id}`}
                    className="group flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-card"
                  >
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-gradient-hero text-accent">
                      <Zap className="h-5 w-5" strokeWidth={2.5} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-semibold text-ink">{b.tenantName}</span>
                        <StatusPill status={b.paymentStatus} />
                      </div>
                      <div className="mt-0.5 truncate text-xs text-ink-muted">
                        {formatMonthShort(b.billingMonth)} · {b.calculation.unitsConsumed} kWh{b.meterId ? ` · ${b.meterId}` : ""}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono-bill text-sm font-bold text-ink">
                        {formatMoney(b.calculation.total)}
                      </div>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setToDelete(b);
                        }}
                        className="mt-1 inline-flex items-center text-[11px] text-ink-muted hover:text-destructive"
                      >
                        <Trash2 className="mr-1 h-3 w-3" /> delete
                      </button>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      {/* Floating action */}
      <Link
        to="/new"
        aria-label="New bill"
        className="fixed bottom-5 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-gradient-accent text-accent-foreground shadow-accent transition-transform hover:scale-105 active:scale-95"
      >
        <Plus className="h-6 w-6" strokeWidth={2.8} />
      </Link>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this bill?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the bill for <strong>{toDelete?.tenantName}</strong> ·{" "}
              {toDelete?.billingMonth}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

function Stat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "success" | "warning";
}) {
  const toneClass =
    tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-ink";
  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-soft">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-ink-muted">
        <span className={toneClass}>{icon}</span>
        {label}
      </div>
      <div className={`mt-1 truncate font-mono-bill text-sm font-bold ${toneClass}`}>{value}</div>
    </div>
  );
}

function StatusPill({ status }: { status: "paid" | "unpaid" }) {
  if (status === "paid") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-success">
        <CheckCircle2 className="h-3 w-3" /> Paid
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-warning">
      <Clock className="h-3 w-3" /> Unpaid
    </span>
  );
}

function formatMonthShort(m: string) {
  const parts = m.split("-").map(Number);
  const [y, mm, dd] = parts;
  if (dd) {
    return new Date(y, (mm || 1) - 1, dd).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
  return new Date(y, (mm || 1) - 1, 1).toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
  });
}

export default Index;
