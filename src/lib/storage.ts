import type { BackupPayload, Bill, TariffConfig, Tenant } from "./types";
import {
  deleteBillFromFirebase,
  deleteTenantFromFirebase,
  isFirebaseEnabled,
  saveBillToFirebase,
  saveTariffToFirebase,
  saveTenantToFirebase,
} from "./firebase";

const TARIFF_KEY = "submetercalc.tariff.v1";
const BILLS_KEY = "submetercalc.bills.v1";
const TENANTS_KEY = "submetercalc.tenants.v1";

// Global error handler for Firebase sync failures
let firebaseErrorHandler: ((error: Error) => void) | null = null;

export function setFirebaseErrorHandler(handler: (error: Error) => void) {
  firebaseErrorHandler = handler;
}

function syncFirebase(fn: () => Promise<void>) {
  if (!isFirebaseEnabled()) return;
  void fn().catch((error) => {
    console.warn("Firebase sync failed", error);
    firebaseErrorHandler?.(error as Error);
  });
}

export const AP_DEFAULT_TARIFF: TariffConfig = {
  slabs: [],
  fixedCharge: 0,
  extras: [],
  currencySymbol: "₹",
  lateFeePerDay: 5,
};

export function loadTariff(): TariffConfig {
  try {
    const raw = localStorage.getItem(TARIFF_KEY);
    if (!raw) return AP_DEFAULT_TARIFF;
    return { ...AP_DEFAULT_TARIFF, ...JSON.parse(raw) };
  } catch {
    return AP_DEFAULT_TARIFF;
  }
}

export function saveTariff(t: TariffConfig) {
  localStorage.setItem(TARIFF_KEY, JSON.stringify(t));
  syncFirebase(() => saveTariffToFirebase(t));
}

export function loadBills(): Bill[] {
  try {
    const raw = localStorage.getItem(BILLS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as Bill[];
    return arr.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  } catch {
    return [];
  }
}

export function saveBill(bill: Bill) {
  const all = loadBills().filter((b) => b.id !== bill.id);
  all.unshift(bill);
  localStorage.setItem(BILLS_KEY, JSON.stringify(all));
  syncFirebase(() => saveBillToFirebase(bill));
}

export function deleteBill(id: string) {
  const all = loadBills().filter((b) => b.id !== id);
  localStorage.setItem(BILLS_KEY, JSON.stringify(all));
  syncFirebase(() => deleteBillFromFirebase(id));
}

export function getBill(id: string): Bill | undefined {
  return loadBills().find((b) => b.id === id);
}

export function getLatestBillFor(tenantName: string): Bill | undefined {
  const key = (s: string) => s.trim().toLowerCase();
  return loadBills().find((b) => key(b.tenantName) === key(tenantName));
}

export function uid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID().slice(0, 8) + Date.now().toString(36).slice(-4);
  }
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

// ---------- Tenants ----------

export function loadTenants(): Tenant[] {
  try {
    const raw = localStorage.getItem(TENANTS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as Tenant[];
    return arr.sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

export function saveTenant(t: Tenant) {
  const all = loadTenants().filter((x) => x.id !== t.id);
  all.push(t);
  localStorage.setItem(TENANTS_KEY, JSON.stringify(all));
  syncFirebase(() => saveTenantToFirebase(t));
}

export function deleteTenant(id: string) {
  const all = loadTenants().filter((x) => x.id !== id);
  localStorage.setItem(TENANTS_KEY, JSON.stringify(all));
  syncFirebase(() => deleteTenantFromFirebase(id));
}

export function findTenantByName(name: string): Tenant | undefined {
  const k = name.trim().toLowerCase();
  return loadTenants().find((t) => t.name.trim().toLowerCase() === k);
}

/** Ensure a tenant exists for the given name; create or enrich if missing. */
export function upsertTenantFromBill(name: string, meterId?: string, phone?: string): Tenant {
  const existing = findTenantByName(name);
  if (existing) {
    const hasChanged =
      (meterId && existing.meterId !== meterId) ||
      (phone && existing.phone !== phone);

    if (hasChanged) {
      const updated: Tenant = {
        ...existing,
        meterId: meterId || existing.meterId,
        phone: phone || existing.phone,
      };
      saveTenant(updated);
      return updated;
    }
    return existing;
  }
  const t: Tenant = {
    id: uid(),
    name: name.trim(),
    meterId,
    phone,
    createdAt: new Date().toISOString(),
  };
  saveTenant(t);
  return t;
}

// ---------- Backup / Restore ----------

export function exportBackup(): BackupPayload {
  return {
    app: "EasyMeter",
    version: 1,
    exportedAt: new Date().toISOString(),
    tariff: loadTariff(),
    bills: loadBills(),
    tenants: loadTenants(),
  };
}

export function importBackup(
  payload: unknown,
  mode: "replace" | "merge" = "merge"
): { bills: number; tenants: number } {
  if (!payload || typeof payload !== "object") throw new Error("Invalid backup file");
  const p = payload as Partial<BackupPayload>;
  if (p.app !== "EasyMeter") throw new Error("Not a EasyMeter backup");
  if (!Array.isArray(p.bills) || !Array.isArray(p.tenants) || !p.tariff) {
    throw new Error("Backup is missing required data");
  }

  if (mode === "replace") {
    localStorage.setItem(BILLS_KEY, JSON.stringify(p.bills));
    localStorage.setItem(TENANTS_KEY, JSON.stringify(p.tenants));
  } else {
    const billMap = new Map<string, Bill>();
    [...loadBills(), ...p.bills].forEach((b) => billMap.set(b.id, b));
    localStorage.setItem(BILLS_KEY, JSON.stringify(Array.from(billMap.values())));

    const tenantMap = new Map<string, Tenant>();
    [...loadTenants(), ...p.tenants].forEach((t) => tenantMap.set(t.id, t));
    localStorage.setItem(TENANTS_KEY, JSON.stringify(Array.from(tenantMap.values())));
  }
  saveTariff(p.tariff);
  return { bills: p.bills.length, tenants: p.tenants.length };
}
