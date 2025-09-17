// src/services/shippingService.fake.ts
// Fake external service that expects SI units (cm, kg). Returns a shipping quote.

export type ShippingServiceInputSI = {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  weightKg: number;
  destinationCountry: string; // ISO-3166 alpha-2
  serviceLevel: "standard" | "express";
};

export type ShippingServiceQuote = {
  cost: number;
  currency: "USD";
  estimatedDays: number;
  usedBillableWeightKg: number;
  breakdown: Array<{ label: string; amount: number }>;
};

export async function getShippingQuoteSI(
  input: ShippingServiceInputSI
): Promise<ShippingServiceQuote> {
  const {
    lengthCm,
    widthCm,
    heightCm,
    weightKg,
    destinationCountry,
    serviceLevel,
  } = input;

  // Volumetric divisor commonly used for air freight; here, simplified
  const volumetricWeightKg = (lengthCm * widthCm * heightCm) / 5000;

  const billableWeightKg = Math.max(weightKg, volumetricWeightKg);

  const base = serviceLevel === "express" ? 20 : 10;
  const perKg = serviceLevel === "express" ? 4 : 2;

  const intlSurcharge = destinationCountry !== "US" ? 15 : 0;

  const cost = round2(base + perKg * billableWeightKg + intlSurcharge);

  const estimatedDays = serviceLevel === "express" ? 2 : 5;

  return {
    cost,
    currency: "USD",
    estimatedDays,
    usedBillableWeightKg: round2(billableWeightKg),
    breakdown: [
      { label: "Base", amount: base },
      { label: "Per Kg", amount: round2(perKg * billableWeightKg) },
      { label: "Intl Surcharge", amount: intlSurcharge },
    ],
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
