import type { BillCalculation, DomesticCategoryId, DomesticCategoryTariff, SlabBreakdown, TariffConfig, TariffSlab, TSSPDCLDomesticTariffConfig } from "./types";
import { TSSPDCL_DOMESTIC_2025_26 } from "./types";

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function formatMoney(n: number, symbol = "₹"): string {
  return `${symbol}${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatUnits(n: number): string {
  return `${n.toLocaleString("en-IN")} kWh`;
}

export function getDomesticCategoryId(totalUnits: number): DomesticCategoryId {
  if (totalUnits <= 100) return "LT1A";
  if (totalUnits <= 200) return "LT1Bi";
  return "LT1Bii";
}

export function findCategory(config: TSSPDCLDomesticTariffConfig, totalUnits: number): DomesticCategoryTariff {
  const id = getDomesticCategoryId(totalUnits);
  const cat = config.categories.find(c => c.id === id);
  if (!cat) {
    throw new Error(`No tariff category for units=${totalUnits}`);
  }
  return cat;
}

export function calcEnergyCharge(units: number, slabs: TariffSlab[]): { total: number; breakdown: SlabBreakdown[] } {
  const sortedSlabs = [...slabs].sort((a, b) => a.from - b.from);
  let remaining = units;
  let total = 0;
  const breakdown: SlabBreakdown[] = [];

  for (const slab of sortedSlabs) {
    if (remaining <= 0) break;

    const slabFrom = slab.from;
    const slabTo = slab.to ?? Number.MAX_SAFE_INTEGER;

    const span = Math.max(0, Math.min(remaining, slabTo - slabFrom + 1));

    if (span > 0) {
      const amount = span * slab.rate;
      total += amount;
      breakdown.push({
        from: slabFrom,
        to: slab.to,
        rate: slab.rate,
        units: span,
        amount: round2(amount),
      });
      remaining -= span;
    }
  }
  return { total, breakdown };
}

export function getCustomerCharge(totalUnits: number): number {
  if (totalUnits <= 50) return 40;
  if (totalUnits <= 100) return 70;
  if (totalUnits <= 200) return 90;
  if (totalUnits <= 300) return 100;
  if (totalUnits <= 400) return 120;
  if (totalUnits <= 800) return 140;
  return 160;
}

export interface DomesticBillInput {
  totalUnits: number;
  contractedLoadKW: number;
  daysLate?: number;
  interestOnED?: number;       // Direct amount (₹) — user-entered
  surchargePerUnit?: number;   // Rate per unit (₹/kWh)
  lossGainPercent?: number;    // % on (energy + fixed + surcharge); positive = debit, negative = credit
}

export function calculateBill(input: DomesticBillInput, tariff?: TariffConfig): BillCalculation {
  const { totalUnits, contractedLoadKW, daysLate = 0, interestOnED = 0, surchargePerUnit = 0, lossGainPercent = 0 } = input;

  const category = findCategory(TSSPDCL_DOMESTIC_2025_26, totalUnits);
  const activeSlabs = tariff?.slabs && tariff.slabs.length > 0 ? tariff.slabs : category.slabs;
  const energyResult = calcEnergyCharge(totalUnits, activeSlabs);
  const energyCharge = round2(energyResult.total);
  const breakdown = energyResult.breakdown;

  let fixedChargePerKW = TSSPDCL_DOMESTIC_2025_26.fixedChargePerKW[category.id];
  if (totalUnits > 800) {
    fixedChargePerKW = 50;
  }

  const fixedCharge = round2(
    tariff && tariff.fixedCharge ? tariff.fixedCharge : contractedLoadKW * fixedChargePerKW
  );
  const customerCharge = round2(getCustomerCharge(totalUnits));
  const electricityDuty = round2(totalUnits * 0.06);

  const extras = (tariff?.extras ?? []).filter(
    (item) => item.label.trim().toLowerCase() !== "electricity duty"
  );
  const extrasTotal = round2(extras.reduce((sum, item) => sum + item.amount, 0));

  // Interest on ED: direct amount entered by user (depends on arrears)
  const interestOnEDAmount = round2(interestOnED);

  // Surcharge: per-unit rate × units consumed
  const surchargeAmount = round2(totalUnits * surchargePerUnit);

  // Loss/Gain: percentage applied on (energy + fixed + surcharge) subtotal
  const subtotalBeforeLG = energyCharge + fixedCharge + surchargeAmount;
  const lossGainAmount = round2(subtotalBeforeLG * (lossGainPercent / 100));

  const defaultLateFeePerDay =
    category.id === "LT1A"
      ? TSSPDCL_DOMESTIC_2025_26.dpsPerMonth.LT1A / 30
      : TSSPDCL_DOMESTIC_2025_26.dpsPerMonth.LT1B / 30;
  const lateFeePerDay = tariff?.lateFeePerDay ?? defaultLateFeePerDay;
  const lateFee = round2(daysLate > 0 ? lateFeePerDay * daysLate : 0);

  const total = round2(
    energyCharge + fixedCharge + customerCharge + electricityDuty +
    extrasTotal + interestOnEDAmount + surchargeAmount + lossGainAmount + lateFee
  );

  return {
    categoryId: category.id,
    totalUnits,
    energyCharge,
    fixedCharge,
    customerCharge,
    electricityDuty,
    interestOnED: interestOnEDAmount,
    surcharge: surchargeAmount,
    surchargePerUnit,
    lossGain: lossGainAmount,
    lossGainPercent,
    lateFee,
    total,
    unitsConsumed: totalUnits,
    extras,
    breakdown,
  };
}
