export interface Slab {
  /** Inclusive lower bound, in units (kWh). */
  from: number;
  /** Inclusive upper bound. Use null for "and above". */
  to: number | null;
  /** Rate in INR per unit. */
  rate: number;
}

export interface ExtraCharge {
  id: string;
  label: string;
  /** Flat amount in INR. */
  amount: number;
}

export interface TariffConfig {
  slabs: Slab[];
  fixedCharge: number;
  extras: ExtraCharge[];
  currencySymbol: string;
  /** Late fee per day, applied after due date. */
  lateFeePerDay: number;
}

export interface SlabBreakdown {
  from: number;
  to: number | null;
  rate: number;
  units: number;
  amount: number;
}

export interface BillCalculation {
  categoryId: DomesticCategoryId;
  totalUnits: number;
  energyCharge: number;
  fixedCharge: number;
  customerCharge: number;
  electricityDuty: number;
  interestOnED: number;
  surcharge: number;
  surchargePerUnit?: number;
  lossGain: number;
  lossGainPercent?: number;
  lateFee: number;
  arrears?: number;
  total: number;
  extras?: ExtraCharge[];
  // Included to prevent TS errors on older saved bills during transition, optional.
  breakdown?: SlabBreakdown[];
  unitsConsumed?: number;
}

export type PaymentStatus = "paid" | "unpaid";

export interface Bill {
  id: string;
  tenantName: string;
  roomName?: string;
  meterId?: string;
  previousReading: number;
  currentReading: number;
  billingMonth: string; // YYYY-MM or YYYY-MM-DD
  billingDate: string;  // ISO
  dueDate: string;      // ISO
  paymentStatus: PaymentStatus;
  tariff: TariffConfig;
  calculation: BillCalculation;
  notes?: string;
  isRollover?: boolean;
  maxReading?: number;
  previousBillId?: string;
  previousBillMonth?: string;
  previousBillAmount?: number;
  previousBillStatus?: PaymentStatus;
  arrears?: number;
  createdAt: string;
}

export interface Tenant {
  id: string;
  name: string;
  meterId?: string;
  phone?: string;
  notes?: string;
  createdAt: string;
}

export interface BackupPayload {
  app: "EasyMeter";
  version: 1;
  exportedAt: string;
  tariff: TariffConfig;
  bills: Bill[];
  tenants: Tenant[];
}

// Tariff types

export type DomesticCategoryId = "LT1A" | "LT1Bi" | "LT1Bii";

export interface TariffSlab {
  from: number;           // inclusive
  to: number | null;      // inclusive, null = no upper limit
  rate: number;           // Rs/kWh
}

export interface DomesticCategoryTariff {
  id: DomesticCategoryId;
  label: string;
  totalUnitsMin: number;        // inclusive
  totalUnitsMax: number | null; // inclusive, null = no cap
  slabs: TariffSlab[];
}

export interface CustomerChargeBand {
  from: number;
  to: number | null;
  amount: number;   // Rs/month
}

export interface TSSPDCLDomesticTariffConfig {
  categories: DomesticCategoryTariff[];
  fixedChargePerKW: {
    LT1A: number;
    LT1Bi: number;
    LT1Bii: number;
  };
  customerChargeBands: CustomerChargeBand[];
  dpsPerMonth: {
    LT1A: number;   // delayed payment surcharge per month
    LT1B: number;   // applies to LT-I(B)(i) and (ii)
  };
  currencySymbol: string;
  // You can keep an extra electricityDutyPercent if you want to apply tax on top.
}

export const TSSPDCL_DOMESTIC_2025_26: TSSPDCLDomesticTariffConfig = {
  currencySymbol: "₹",
  categories: [
    {
      id: "LT1A",
      label: "LT-I(A) up to 100 units/month",
      totalUnitsMin: 0,
      totalUnitsMax: 100,
      slabs: [
        { from: 1, to: 50, rate: 1.95 },
        { from: 51, to: 100, rate: 3.10 },
      ],
    },
    {
      id: "LT1Bi",
      label: "LT-I(B)(i) 101–200 units/month",
      totalUnitsMin: 101,
      totalUnitsMax: 200,
      slabs: [
        { from: 1, to: 100, rate: 3.40 },
        { from: 101, to: 200, rate: 4.80 },
      ],
    },
    {
      id: "LT1Bii",
      label: "LT-I(B)(ii) above 200 units/month",
      totalUnitsMin: 201,
      totalUnitsMax: null,
      slabs: [
        { from: 1, to: 200, rate: 5.10 },
        { from: 201, to: 300, rate: 7.70 },
        { from: 301, to: 400, rate: 9.00 },
        { from: 401, to: 800, rate: 9.50 },
        { from: 801, to: null, rate: 10.00 },
      ],
    },
  ],
  fixedChargePerKW: {
    LT1A: 10,
    LT1Bi: 10,
    LT1Bii: 10,   // ₹10/kW/month for all LT-I domestic categories up to 800 units
  },
  customerChargeBands: [
    { from: 0, to: 50, amount: 40 },
    { from: 51, to: 100, amount: 70 },
    { from: 101, to: 200, amount: 90 },
    { from: 201, to: 300, amount: 100 },
    { from: 301, to: 400, amount: 120 },
    { from: 401, to: 800, amount: 140 },
    { from: 801, to: null, amount: 160 },
  ],
  dpsPerMonth: {
    LT1A: 10,    // Rs/month
    LT1B: 25,    // Rs/month for LT-I(B) categories
  },
};
