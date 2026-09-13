import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { loadBills } from "@/lib/storage";
import type { Bill } from "@/lib/types";
import { formatMoney, formatUnits } from "@/lib/calc";
import { getMonthlyBilling, getMonthlyConsumption, getTenantLeaderboard } from "@/lib/analytics";
import { BarChart3, FileText, Trophy, Zap } from "lucide-react";

function formatMonthTick(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, (m || 1) - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
}

const Analytics = () => {
  const { user } = useAuth();
  const [bills, setBills] = useState<Bill[]>([]);

  useEffect(() => {
    setBills(loadBills());
  }, [user?.uid]);

  const consumption = useMemo(() => getMonthlyConsumption(bills), [bills]);
  const billing = useMemo(() => getMonthlyBilling(bills), [bills]);
  const leaderboard = useMemo(() => getTenantLeaderboard(bills).slice(0, 10), [bills]);

  if (bills.length === 0) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <AppHeader />
        <main className="container max-w-5xl px-4 pb-24 pt-8">
          <div className="rounded-[2rem] border-2 border-dashed border-paper-line bg-transparent p-16 text-center">
            <BarChart3 className="mx-auto h-12 w-12 text-ink-muted/20" />
            <h3 className="mt-4 font-bold text-ink">No data to analyze yet</h3>
            <p className="mt-2 text-sm text-ink-muted">Create a few bills to see usage trends here.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <AppHeader />
      <main className="container max-w-5xl px-4 pb-24 pt-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-ink">Usage Analytics</h1>
          <p className="mt-1 text-sm text-ink-muted">Consumption and billing trends across all tenants.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="rounded-[2rem] border-none bg-white p-6 shadow-card ring-1 ring-paper-line">
            <div className="mb-4 flex items-center gap-2">
              <Zap className="h-5 w-5 text-accent" />
              <h2 className="font-display text-lg font-bold text-ink">Consumption Trend</h2>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={consumption} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--paper-line))" />
                  <XAxis
                    dataKey="month"
                    tickFormatter={formatMonthTick}
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip
                    formatter={(value: number) => [formatUnits(value), "Units"]}
                    labelFormatter={formatMonthTick}
                    contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--paper-line))" }}
                  />
                  <Bar dataKey="units" name="Units" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="rounded-[2rem] border-none bg-white p-6 shadow-card ring-1 ring-paper-line">
            <div className="mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-accent" />
              <h2 className="font-display text-lg font-bold text-ink">Paid vs. Outstanding</h2>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={billing} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--paper-line))" />
                  <XAxis
                    dataKey="month"
                    tickFormatter={formatMonthTick}
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip
                    formatter={(value: number) => formatMoney(value)}
                    labelFormatter={formatMonthTick}
                    contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--paper-line))" }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar
                    dataKey="paid"
                    name="Paid"
                    stackId="billing"
                    fill="hsl(var(--success))"
                    radius={[0, 0, 0, 0]}
                    maxBarSize={40}
                  />
                  <Bar
                    dataKey="unpaid"
                    name="Unpaid"
                    stackId="billing"
                    fill="hsl(var(--warning))"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <Card className="mt-6 rounded-[2rem] border-none bg-white p-6 shadow-card ring-1 ring-paper-line">
          <div className="mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-accent" />
            <h2 className="font-display text-lg font-bold text-ink">Top Tenants by Usage</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="border-b border-paper-line text-left text-[11px] uppercase tracking-wider text-ink-muted">
                  <th className="pb-2 font-bold">Tenant</th>
                  <th className="pb-2 font-bold">Bills</th>
                  <th className="pb-2 font-bold text-right">Total Units</th>
                  <th className="pb-2 font-bold text-right">Total Billed</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((row) => (
                  <tr key={row.tenantName} className="border-b border-paper-line/60 last:border-0">
                    <td className="py-2.5 font-semibold text-ink">{row.tenantName}</td>
                    <td className="py-2.5 text-ink-muted">{row.billCount}</td>
                    <td className="py-2.5 text-right font-mono-bill text-ink">{formatUnits(row.totalUnits)}</td>
                    <td className="py-2.5 text-right font-mono-bill text-ink">{formatMoney(row.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default Analytics;
