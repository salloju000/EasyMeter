import { describe, it, expect } from "vitest";
import { calcEnergyCharge, calculateBill, getDomesticCategoryId, findCategory, round2 } from "./calc";
import { TSSPDCL_DOMESTIC_2025_26 } from "./types";

describe("getDomesticCategoryId", () => {
  it("returns LT1A for 0-100 units", () => {
    expect(getDomesticCategoryId(0)).toBe("LT1A");
    expect(getDomesticCategoryId(50)).toBe("LT1A");
    expect(getDomesticCategoryId(87)).toBe("LT1A");
    expect(getDomesticCategoryId(100)).toBe("LT1A");
  });

  it("returns LT1Bi for 101-200 units", () => {
    expect(getDomesticCategoryId(101)).toBe("LT1Bi");
    expect(getDomesticCategoryId(135)).toBe("LT1Bi");
    expect(getDomesticCategoryId(200)).toBe("LT1Bi");
  });

  it("returns LT1Bii for 201+ units", () => {
    expect(getDomesticCategoryId(201)).toBe("LT1Bii");
    expect(getDomesticCategoryId(500)).toBe("LT1Bii");
  });
});

describe("calcEnergyCharge - User Test Cases", () => {
  it("TEST CASE 1: 87 units → ₹212.20", () => {
    const cat = findCategory(TSSPDCL_DOMESTIC_2025_26, 87);
    console.log("Category for 87 units:", cat.id, cat.label);
    console.log("Slabs:", JSON.stringify(cat.slabs));
    
    const result = calcEnergyCharge(87, cat.slabs);
    const charge = result.total;
    console.log("Energy charge for 87 units:", charge);
    
    expect(round2(charge)).toBe(212.2);
  });

  it("TEST CASE 2: 135 units → ₹508.00", () => {
    const cat = findCategory(TSSPDCL_DOMESTIC_2025_26, 135);
    console.log("Category for 135 units:", cat.id, cat.label);
    console.log("Slabs:", JSON.stringify(cat.slabs));
    
    const result = calcEnergyCharge(135, cat.slabs);
    const charge = result.total;
    console.log("Energy charge for 135 units:", charge);
    
    expect(round2(charge)).toBe(508);
  });

  it("TEST CASE 3: 343 units (Telangana LT-I(B)(ii) example) → ₹2177.00", () => {
    // Example from Telangana formula:
    // Current reading: 9050, Previous reading: 8707
    // Units = 9050 - 8707 = 343 units
    // Uses LT-I(B)(ii) slabs (>200 units):
    // - 200 units @ ₹5.10 = ₹1020.00
    // - 100 units @ ₹7.70 = ₹770.00
    // - 43 units @ ₹9.00 = ₹387.00
    // Total = ₹2177.00
    const cat = findCategory(TSSPDCL_DOMESTIC_2025_26, 343);
    console.log("Category for 343 units:", cat.id, cat.label);
    console.log("Slabs:", JSON.stringify(cat.slabs));
    
    const result = calcEnergyCharge(343, cat.slabs);
    const charge = result.total;
    console.log("Energy charge for 343 units:", charge);
    console.log("Breakdown: 200@5.10=1020 + 100@7.70=770 + 43@9.00=387 = 2177");
    
    expect(round2(charge)).toBe(2177);
  });
});

describe("calculateBill - Full bill verification", () => {
  it("87 units bill breakdown", () => {
    const bill = calculateBill({ totalUnits: 87, contractedLoadKW: 1, daysLate: 0 });
    console.log("=== FULL BILL FOR 87 UNITS ===");
    console.log("Category:", bill.categoryId);
    console.log("Energy Charge:", bill.energyCharge);
    console.log("Fixed Charge:", bill.fixedCharge);
    console.log("Customer Charge:", bill.customerCharge);
    console.log("Electricity Duty:", bill.electricityDuty);
    console.log("Late Fee:", bill.lateFee);
    console.log("Total:", bill.total);
    
    expect(bill.energyCharge).toBe(212.2);
  });

  it("135 units bill breakdown", () => {
    const bill = calculateBill({ totalUnits: 135, contractedLoadKW: 1, daysLate: 0 });
    console.log("=== FULL BILL FOR 135 UNITS ===");
    console.log("Category:", bill.categoryId);
    console.log("Energy Charge:", bill.energyCharge);
    console.log("Fixed Charge:", bill.fixedCharge);
    console.log("Customer Charge:", bill.customerCharge);
    console.log("Electricity Duty:", bill.electricityDuty);
    console.log("Late Fee:", bill.lateFee);
    console.log("Total:", bill.total);
    
    expect(bill.energyCharge).toBe(508);
  });

  it("343 units bill breakdown (Telangana example)", () => {
    const bill = calculateBill({ totalUnits: 343, contractedLoadKW: 1, daysLate: 0 });
    console.log("=== FULL BILL FOR 343 UNITS ===");
    console.log("Category:", bill.categoryId);
    console.log("Energy Charge:", bill.energyCharge);
    console.log("Fixed Charge:", bill.fixedCharge);
    console.log("Customer Charge:", bill.customerCharge);
    console.log("Electricity Duty:", bill.electricityDuty);
    console.log("Late Fee:", bill.lateFee);
    console.log("Total:", bill.total);
    
    expect(bill.energyCharge).toBe(2177);
  });

  it("800 units uses ₹10/kW fixed charge", () => {
    const bill = calculateBill({ totalUnits: 800, contractedLoadKW: 2, daysLate: 0 });
    expect(bill.fixedCharge).toBe(20);
  });

  it("801 units uses ₹50/kW fixed charge", () => {
    const bill = calculateBill({ totalUnits: 801, contractedLoadKW: 2, daysLate: 0 });
    expect(bill.fixedCharge).toBe(100);
  });
});

describe("calculateBill - custom tariff support", () => {
  it("uses custom slab rates from tariff settings", () => {
    const customTariff = {
      slabs: [
        { from: 1, to: 50, rate: 2 },
        { from: 51, to: null, rate: 4 },
      ],
      fixedCharge: 50,
      extras: [],
      currencySymbol: "₹",
      lateFeePerDay: 5,
    };

    const bill = calculateBill({ totalUnits: 60, contractedLoadKW: 1 }, customTariff);
    expect(bill.energyCharge).toBe(140);
  });

  it("calculates energy charges correctly even when slabs are out of order", () => {
    const customTariff = {
      slabs: [
        { from: 51, to: null, rate: 4 },
        { from: 1, to: 50, rate: 2 },
      ],
      fixedCharge: 50,
      extras: [],
      currencySymbol: "₹",
      lateFeePerDay: 5,
    };

    const bill = calculateBill({ totalUnits: 60, contractedLoadKW: 1 }, customTariff);
    expect(bill.energyCharge).toBe(140);
  });

  it("uses tariff fixed charge when a tariff override is provided", () => {
    const customTariff = {
      slabs: [
        { from: 1, to: 50, rate: 2 },
        { from: 51, to: null, rate: 4 },
      ],
      fixedCharge: 50,
      extras: [],
      currencySymbol: "₹",
      lateFeePerDay: 5,
    };

    const bill = calculateBill({ totalUnits: 60, contractedLoadKW: 1 }, customTariff);
    expect(bill.fixedCharge).toBe(50);
  });

  it("falls back to per-kW fixed charge when tariff fixedCharge is 0", () => {
    const customTariff = {
      slabs: [
        { from: 1, to: 50, rate: 2 },
        { from: 51, to: null, rate: 4 },
      ],
      fixedCharge: 0,
      extras: [],
      currencySymbol: "₹",
      lateFeePerDay: 5,
    };

    const bill = calculateBill({ totalUnits: 60, contractedLoadKW: 2 }, customTariff);
    expect(bill.fixedCharge).toBe(20);
  });

  it("ignores duplicate Electricity Duty extras to avoid double counting", () => {
    const customTariff = {
      slabs: [
        { from: 1, to: 50, rate: 1.95 },
        { from: 51, to: null, rate: 3.1 },
      ],
      fixedCharge: 50,
      extras: [{ id: "duty", label: "Electricity Duty", amount: 10 }],
      currencySymbol: "₹",
      lateFeePerDay: 5,
    };

    const bill = calculateBill({ totalUnits: 60, contractedLoadKW: 1 }, customTariff);
    expect(bill.extras).toEqual([]);
    // Energy: 50*1.95 + 10*3.10 = 97.5 + 31 = 128.5
    // Fixed: custom tariff override = 50
    // Customer: 70 (for 60 units)
    // Electricity Duty: 60 * 0.06 = 3.6
    // Total: 128.5 + 50 + 70 + 3.6 = 252.1
    expect(bill.total).toBe(252.1);
  });
});
