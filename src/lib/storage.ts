import type { BackupPayload, Bill, TariffConfig, Tenant } from "./types";
import {
  deleteBillFromFirebase,
  deleteTenantFromFirebase,
  isFirebaseEnabled,
  saveBillToFirebase,
  saveTariffToFirebase,
  saveTenantToFirebase,
  loadBillsFromFirebase,
  loadTenantsFromFirebase,
  loadTariffFromFirebase,
} from "./firebase";

// Global state for current user and error handler
let currentUserId: string | null = null;
let firebaseErrorHandler: ((error: Error) => void) | null = null;

export function setCurrentUser(userId: string | null) {
  currentUserId = userId;
}

function getStorageKey(baseKey: string): string {
  if (!currentUserId) return baseKey;
  return `${baseKey}.user.${currentUserId}`;
}

const TARIFF_BASE_KEY = "submetercalc.tariff.v1";
const BILLS_BASE_KEY = "submetercalc.bills.v1";
const TENANTS_BASE_KEY = "submetercalc.tenants.v1";

export function setFirebaseErrorHandler(handler: (error: Error) => void) {
  firebaseErrorHandler = handler;
}

export async function syncUserDataFromFirebase() {
  if (!currentUserId || !isFirebaseEnabled()) return;

  try {
    const [bills, tenants, tariff] = await Promise.all([
      loadBillsFromFirebase(),
      loadTenantsFromFirebase(),
      loadTariffFromFirebase(),
    ]);

    if (bills.length > 0) {
      localStorage.setItem(getStorageKey(BILLS_BASE_KEY), JSON.stringify(bills));
    }
    if (tenants.length > 0) {
      localStorage.setItem(getStorageKey(TENANTS_BASE_KEY), JSON.stringify(tenants));
    }
    if (tariff) {
      localStorage.setItem(getStorageKey(TARIFF_BASE_KEY), JSON.stringify(tariff));
    }
  } catch (error) {
    console.warn("Failed to sync user data from Firebase", error);
    firebaseErrorHandler?.(error as Error);
  }
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
    const key = getStorageKey(TARIFF_BASE_KEY);
    const raw = localStorage.getItem(key);
    if (!raw) return AP_DEFAULT_TARIFF;
    return { ...AP_DEFAULT_TARIFF, ...JSON.parse(raw) };
  } catch {
    return AP_DEFAULT_TARIFF;
  }
}

export function saveTariff(t: TariffConfig) {
  const key = getStorageKey(TARIFF_BASE_KEY);
  localStorage.setItem(key, JSON.stringify(t));
  syncFirebase(() => saveTariffToFirebase(t));
}

export function loadBills(): Bill[] {
  try {
    const key = getStorageKey(BILLS_BASE_KEY);
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const arr = JSON.parse(raw) as Bill[];
    return arr.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  } catch {
    return [];
  }
}

export function saveBill(bill: Bill) {
  const key = getStorageKey(BILLS_BASE_KEY);
  const all = loadBills().filter((b) => b.id !== bill.id);
  all.unshift(bill);
  localStorage.setItem(key, JSON.stringify(all));
  syncFirebase(() => saveBillToFirebase(bill));
}

export function deleteBill(id: string) {
  const key = getStorageKey(BILLS_BASE_KEY);
  const all = loadBills().filter((b) => b.id !== id);
  localStorage.setItem(key, JSON.stringify(all));
  syncFirebase(() => deleteBillFromFirebase(id));
}

export function getBill(id: string): Bill | undefined {
  return loadBills().find((b) => b.id === id);
}

export function getLatestBillFor(tenantName: string): Bill | undefined {
  const key = (s: string) => s.trim().toLowerCase();
  return loadBills().find((b) => key(b.tenantName) === key(tenantName));
}

export function getPreviousBillFor(tenantName: string, currentBillId?: string): Bill | undefined {
  const key = (s: string) => s.trim().toLowerCase();
  return loadBills().find((b) => key(b.tenantName) === key(tenantName) && b.id !== currentBillId);
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
    const key = getStorageKey(TENANTS_BASE_KEY);
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const arr = JSON.parse(raw) as Tenant[];
    return arr.sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

export function saveTenant(t: Tenant) {
  const key = getStorageKey(TENANTS_BASE_KEY);
  const all = loadTenants().filter((x) => x.id !== t.id);
  all.push(t);
  localStorage.setItem(key, JSON.stringify(all));
  syncFirebase(() => saveTenantToFirebase(t));
}

export function deleteTenant(id: string) {
  const key = getStorageKey(TENANTS_BASE_KEY);
  const all = loadTenants().filter((x) => x.id !== id);
  localStorage.setItem(key, JSON.stringify(all));
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
    localStorage.setItem(getStorageKey(BILLS_BASE_KEY), JSON.stringify(p.bills));
    localStorage.setItem(getStorageKey(TENANTS_BASE_KEY), JSON.stringify(p.tenants));
  } else {
    const billMap = new Map<string, Bill>();
    [...loadBills(), ...p.bills].forEach((b) => billMap.set(b.id, b));
    localStorage.setItem(getStorageKey(BILLS_BASE_KEY), JSON.stringify(Array.from(billMap.values())));

    const tenantMap = new Map<string, Tenant>();
    [...loadTenants(), ...p.tenants].forEach((t) => tenantMap.set(t.id, t));
    localStorage.setItem(getStorageKey(TENANTS_BASE_KEY), JSON.stringify(Array.from(tenantMap.values())));
  }
  saveTariff(p.tariff);
  return { bills: p.bills.length, tenants: p.tenants.length };
}
