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
    
    const charge = calcEnergyCharge(87, cat.slabs);
    console.log("Energy charge for 87 units:", charge);
    
    expect(round2(charge)).toBe(212.20);
  });

  it("TEST CASE 2: 135 units → ₹508.00", () => {
    const cat = findCategory(TSSPDCL_DOMESTIC_2025_26, 135);
    console.log("Category for 135 units:", cat.id, cat.label);
    console.log("Slabs:", JSON.stringify(cat.slabs));
    
    const charge = calcEnergyCharge(135, cat.slabs);
    console.log("Energy charge for 135 units:", charge);
    
    expect(round2(charge)).toBe(508.00);
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
    
    expect(bill.energyCharge).toBe(212.20);
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
    
    expect(bill.energyCharge).toBe(508.00);
  });
});
