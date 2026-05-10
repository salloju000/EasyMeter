import { Zap } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { isFirebaseEnabled } from "@/lib/firebase";

export const AppHeader = () => {
  const { pathname } = useLocation();
  const firebaseEnabled = isFirebaseEnabled();
  const tabs = [
    { to: "/", label: "Bills" },
    { to: "/new", label: "New" },
    { to: "/tenants", label: "Tenants" },
    { to: "/tariff", label: "Tariff" },
  ];
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="container flex h-14 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-hero shadow-soft">
            <Zap className="h-5 w-5 text-accent" strokeWidth={2.5} />
          </div>
          <div className="leading-tight">
            <div className="font-display text-base font-bold text-ink">EasyMeter</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-ink-muted">EB-style billing</div>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]",
              firebaseEnabled
                ? "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20"
                : "bg-amber-500/10 text-amber-700 ring-1 ring-amber-500/20"
            )}
          >
            {firebaseEnabled ? "Firebase sync enabled" : "Firebase sync disabled"}
          </span>
          <nav className="flex items-center gap-1 rounded-full bg-secondary p-1 text-xs font-medium">
            {tabs.map((t) => {
              const active = t.to === "/" ? pathname === "/" : pathname.startsWith(t.to);
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  className={cn(
                    "rounded-full px-3 py-1.5 transition-colors",
                    active
                      ? "bg-primary text-primary-foreground shadow-soft"
                      : "text-ink-muted hover:text-ink"
                  )}
                >
                  {t.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
};
