import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { loadBills, loadTenants } from "@/lib/storage";
import { formatMoney, formatUnits } from "@/lib/calc";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileText,
  Hash,
  IndianRupee,
  Phone,
  Plus,
  User,
  Zap,
} from "lucide-react";

const TenantHistory = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const tenant = useMemo(() => loadTenants().find((t) => t.id === id), [id]);

  const bills = useMemo(() => {
    if (!tenant) return [];
    const key = tenant.name.trim().toLowerCase();
    return loadBills().filter((b) => b.tenantName.trim().toLowerCase() === key);
  }, [tenant]);

  const totalPaid = bills
    .filter((b) => b.paymentStatus === "paid")
    .reduce((s, b) => s + b.calculation.total, 0);
  const outstanding = bills
    .filter((b) => b.paymentStatus === "unpaid")
    .reduce((s, b) => s + b.calculation.total, 0);
  const totalUnits = bills.reduce((s, b) => s + b.calculation.unitsConsumed, 0);

  if (!tenant) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container max-w-2xl px-4 pb-24 pt-6">
          <Card className="border-dashed bg-paper p-10 text-center">
            <p className="font-medium text-ink">Tenant not found</p>
            <Button asChild variant="outline" className="mt-4">
              <Link to="/tenants">Back to tenants</Link>
            </Button>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container max-w-2xl px-4 pb-24 pt-6">
        <button
          onClick={() => navigate(-1)}
          className="mb-3 inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        {/* Tenant header */}
        <section className="overflow-hidden rounded-2xl bg-gradient-hero p-5 text-primary-foreground shadow-card">
          <div className="flex items-start gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-accent/20 ring-1 ring-accent/40">
              <User className="h-6 w-6 text-accent" strokeWidth={2.5} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] uppercase tracking-[0.22em] text-accent">
                Tenant history
              </div>
              <h1 className="mt-1 truncate font-display text-2xl font-bold">{tenant.name}</h1>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs opacity-85">
                {tenant.meterId && (
                  <span className="inline-flex items-center gap-1">
                    <Hash className="h-3 w-3" /> {tenant.meterId}
                  </span>
                )}
                {tenant.phone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {tenant.phone}
                  </span>
                )}
                <span>{bills.length} bill{bills.length === 1 ? "" : "s"}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="mt-5 grid grid-cols-3 gap-2">
          <Stat
            icon={<IndianRupee className="h-4 w-4" />}
            label="Paid"
            value={formatMoney(totalPaid)}
            tone="success"
          />
          <Stat
            icon={<Clock className="h-4 w-4" />}
            label="Outstanding"
            value={formatMoney(outstanding)}
            tone="warning"
          />
          <Stat
            icon={<Zap className="h-4 w-4" />}
            label="Total Units"
            value={formatUnits(totalUnits)}
          />
        </section>

        {/* History */}
        <section className="mt-7">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-ink">Bills</h2>
            <Button asChild size="sm" variant="outline" className="gap-1">
              <Link to="/new" state={{ prefillTenantId: tenant.id }}>
                <Plus className="h-3.5 w-3.5" /> New
              </Link>
            </Button>
          </div>

          {bills.length === 0 ? (
            <Card className="border-dashed bg-paper p-10 text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-secondary text-ink-muted">
                <FileText className="h-6 w-6" />
              </div>
              <p className="mt-3 font-medium text-ink">No bills yet for this tenant</p>
              <Button asChild className="mt-4">
                <Link to="/new">
                  <Plus className="mr-1 h-4 w-4" /> Create Bill
                </Link>
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
                        <span className="truncate font-semibold text-ink">
                          {formatMonthShort(b.billingMonth)}
                        </span>
                        <StatusPill status={b.paymentStatus} />
                      </div>
                      <div className="mt-0.5 truncate text-xs text-ink-muted">
                        {b.calculation.unitsConsumed} kWh ·{" "}
                        {b.previousReading} → {b.currentReading}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono-bill text-sm font-bold text-ink">
                        {formatMoney(b.calculation.total)}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
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

export default TenantHistory;
