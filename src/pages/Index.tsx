import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/lib/auth";
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
import {
  Plus,
  FileText,
  Trash2,
  Zap,
  IndianRupee,
  CheckCircle2,
  Clock,
  TrendingUp,
  ChevronRight,
  ArrowUpRight,
  CalendarDays,
  LayoutGrid,
  Users,
  Settings
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

const Index = () => {
  const { user } = useAuth();
  const [bills, setBills] = useState<Bill[]>([]);
  const [toDelete, setToDelete] = useState<Bill | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    setBills(loadBills());
  }, [user?.uid]);

  const confirmDelete = () => {
    if (!toDelete) return;
    deleteBill(toDelete.id);
    setBills(loadBills());
    toast({ title: "Bill purged", description: "The record has been permanently removed." });
    setToDelete(null);
  };

  const stats = useMemo(() => {
    const totalCollected = bills
      .filter((b) => b.paymentStatus === "paid")
      .reduce((s, b) => s + b.calculation.total, 0);
    const pending = bills
      .filter((b) => b.paymentStatus === "unpaid")
      .reduce((s, b) => s + b.calculation.total, 0);
    const totalUnits = bills.reduce((s, b) => s + b.calculation.unitsConsumed, 0);
    return { totalCollected, pending, totalUnits };
  }, [bills]);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <AppHeader />

      <main className="container max-w-6xl px-4 pb-32 pt-8">
        {/* Modern Bento Header */}
        <div className="grid gap-6 lg:grid-cols-12">

          {/* Main Welcome Card */}
          <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-hero p-8 text-primary-foreground shadow-2xl lg:col-span-8">
            <div className="relative z-10">
              <div className="flex items-center gap-3 opacity-70">
                <LayoutGrid className="h-4 w-4" />
                <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Operational Hub</span>
              </div>
              <h1 className="mt-6 font-display text-4xl font-bold tracking-tight lg:text-5xl">
                Ready to bill, <br /> <span className="text-accent">Property Manager?</span>
              </h1>
              <p className="mt-4 max-w-md text-lg text-primary-foreground/60">
                Everything you need to manage your energy revenue in one fluid interface.
              </p>

              <div className="mt-10 flex flex-wrap gap-4">
                <Button asChild size="lg" className="h-16 rounded-2xl bg-white px-8 text-lg font-bold text-ink shadow-xl hover:bg-white/90 active:scale-95 transition-all">
                  <Link to="/new">
                    <Plus className="mr-2 h-6 w-6 text-accent" strokeWidth={3} /> Create Statement
                  </Link>
                </Button>
                <div className="flex gap-2">
                  <Button asChild variant="ghost" className="h-16 w-16 rounded-2xl bg-white/10 p-0 text-white backdrop-blur-md hover:bg-white/20">
                    <Link to="/tenants" title="Tenants"><Users className="h-6 w-6" /></Link>
                  </Button>
                  <Button asChild variant="ghost" className="h-16 w-16 rounded-2xl bg-white/10 p-0 text-white backdrop-blur-md hover:bg-white/20">
                    <Link to="/tariff" title="Settings"><Settings className="h-6 w-6" /></Link>
                  </Button>
                </div>
              </div>
            </div>

            {/* Background Decoration */}
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-accent/20 blur-[100px]" />
            <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-blue-500/10 blur-[100px]" />
          </div>

          {/* Quick Stats Bento Column */}
          <div className="grid gap-6 lg:col-span-4 sm:grid-cols-2 lg:grid-cols-1">
            <BentoStatCard
              label="Collected"
              value={formatMoney(stats.totalCollected)}
              icon={<CheckCircle2 className="h-6 w-6" />}
              className="bg-white text-ink border-none shadow-card ring-1 ring-paper-line"
              accentColor="text-success"
            />
            <BentoStatCard
              label="Outstanding"
              value={formatMoney(stats.pending)}
              icon={<Clock className="h-6 w-6" />}
              className="bg-accent text-accent-foreground border-none shadow-accent"
              accentColor="text-white"
            />
          </div>
        </div>

        {/* Bottom Section: Activity & Details */}
        <div className="mt-12 grid gap-12 lg:grid-cols-12">

          {/* Recent Activity Stream */}
          <div className="lg:col-span-7">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h2 className="font-display text-2xl font-bold text-ink">Activity Stream</h2>
                <p className="text-sm text-ink-muted">Your latest billing interactions</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-soft ring-1 ring-paper-line">
                <TrendingUp className="h-5 w-5 text-accent" />
              </div>
            </div>

            {bills.length === 0 ? (
              <div className="rounded-[2rem] border-2 border-dashed border-paper-line bg-transparent p-16 text-center">
                <FileText className="mx-auto h-12 w-12 text-ink-muted/20" />
                <h3 className="mt-4 font-bold text-ink">No activity yet</h3>
                <p className="mt-2 text-sm text-ink-muted">Start by creating your first bill.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {bills.map((b) => (
                  <div key={b.id} className="group relative">
                    <Link
                      to={`/bill/${b.id}`}
                      className="flex items-center gap-5 rounded-[1.5rem] bg-white p-5 shadow-soft transition-all hover:shadow-card group-hover:-translate-y-1"
                    >
                      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-secondary/50 text-accent transition-transform group-hover:scale-110">
                        <Zap className="h-7 w-7" strokeWidth={2.5} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3">
                          <span className="truncate font-display text-xl font-bold text-ink">{b.tenantName}</span>
                          <StatusPill status={b.paymentStatus} />
                        </div>
                        <div className="mt-1 flex items-center gap-4 text-[13px] text-ink-muted">
                          <span className="flex items-center gap-1.5 font-medium">
                            <CalendarDays className="h-4 w-4 opacity-40" />
                            {formatMonthShort(b.billingMonth)}
                          </span>
                          <span className="h-1 w-1 rounded-full bg-paper-line" />
                          <span className="flex items-center gap-1.5 font-medium">
                            <Zap className="h-4 w-4 opacity-40" />
                            {b.calculation.unitsConsumed} Units
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono-bill text-2xl font-bold text-ink">
                          {formatMoney(b.calculation.total)}
                        </div>
                        <div className="mt-1 inline-flex items-center rounded-lg bg-accent/5 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-accent opacity-0 transition-opacity group-hover:opacity-100">
                          Review <ChevronRight className="h-3 w-3" />
                        </div>
                      </div>
                    </Link>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setToDelete(b);
                      }}
                      className="absolute -right-3 -top-3 grid h-10 w-10 place-items-center rounded-full bg-white text-ink-muted shadow-xl ring-1 ring-paper-line opacity-0 transition-all hover:bg-destructive hover:text-white group-hover:opacity-100"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Side Info Cards */}
          <div className="space-y-8 lg:col-span-5">
            <Card className="rounded-[2rem] border-none bg-white p-8 shadow-card ring-1 ring-paper-line">
              <h3 className="font-display text-xl font-bold text-ink">Utility Diagnostics</h3>
              <div className="mt-8 grid gap-6">
                <SidebarStatItem
                  label="Network Consumption"
                  value={`${formatUnits(stats.totalUnits)}`}
                  icon={<Zap className="h-5 w-5" />}

                />
                <SidebarStatItem
                  label="Average per Bill"
                  value={formatMoney(bills.length > 0 ? stats.totalCollected / bills.length : 0)}
                  icon={<IndianRupee className="h-5 w-5" />}
                />
              </div>
              <div className="mt-10 rounded-2xl bg-secondary/30 p-5">
                <p className="text-xs leading-relaxed text-ink-muted">
                  Your billing engine is running on **TSPDCL Domestic Category** rules.
                  <Link to="/tariff" className="ml-1 font-bold text-accent hover:underline">Change Settings</Link>
                </p>
              </div>
            </Card>
          </div>
        </div>
      </main>

      {/* Floating Action FAB - Refined */}
      <Link
        to="/new"
        className="fixed bottom-10 right-10 z-40 flex h-20 w-20 items-center justify-center rounded-[2rem] bg-gradient-accent text-accent-foreground shadow-2xl transition-all hover:scale-110 hover:-rotate-6 active:scale-95"
      >
        <Plus className="h-10 w-10" strokeWidth={3} />
      </Link>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent className="rounded-[2rem] p-8">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-2xl font-bold">Purge this Record?</AlertDialogTitle>
            <AlertDialogDescription className="mt-2 text-lg">
              The invoice for <strong>{toDelete?.tenantName}</strong> will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-4">
            <AlertDialogCancel className="h-14 rounded-2xl border-none bg-secondary/50 text-lg font-bold text-ink hover:bg-secondary">Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="h-14 rounded-2xl bg-destructive px-8 text-lg font-bold text-white shadow-lg shadow-destructive/20 hover:bg-destructive/90"
            >
              Purge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

function BentoStatCard({ label, value, icon, className, accentColor }: any) {
  return (
    <div className={`flex flex-col justify-between rounded-[2rem] p-8 transition-transform hover:scale-[1.02] ${className}`}>
      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/20 ${accentColor}`}>
        {icon}
      </div>
      <div className="mt-12">
        <div className="text-xs font-bold uppercase tracking-widest opacity-60">{label}</div>
        <div className="mt-2 font-mono-bill text-3xl font-bold leading-none tracking-tight">{value}</div>
      </div>
    </div>
  );
}

function SidebarStatItem({ label, value, icon }: any) {
  return (
    <div className="flex items-center gap-4">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-secondary/50 text-accent">
        {icon}
      </div>
      <div className="flex-1">
        <div className="text-xs font-bold uppercase tracking-widest text-ink-muted opacity-60">{label}</div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="font-mono-bill text-xl font-bold text-ink">{value}</span>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: "paid" | "unpaid" }) {
  if (status === "paid") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-success">
        <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
        Paid
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-warning">
      <div className="h-1.5 w-1.5 rounded-full bg-warning" />
      Pending
    </span>
  );
}

function formatMonthShort(m: string) {
  const parts = m.split("-").map(Number);
  const [y, mm, dd] = parts;
  if (parts.length === 3) {
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
