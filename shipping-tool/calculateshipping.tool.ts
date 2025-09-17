// src/tools/calcShipping.tool.ts
// The tool implementation: bad path (no validation/metadata/JSON Schema) vs good path (with all 3).
// Input and output validation via Zod; unit normalization to SI; calls the external shipping service.
// JSON Schema is derived from Zod schemas (see package.schema.ts).

import {
  ShippingQuote,
  PackageInputSchema,
  QuoteSchema,
} from "./package.schema";
import { getShippingQuoteSI } from "./shipping.service";

// Bad: no validation, guesses, and ignores units -> incorrect pricing.
export async function calcShippingToolBad(unvalidated: any): Promise<any> {
  // Assume incoming shape might be like:
  // { length: "20", width: 15, height: 10, unit: "imperial", weight: "5", weightUnit: "pounds", country: "DE", service: "fast" }
  // This function intentionally does all the wrong things to demonstrate failures.

  // Wrong: blind casting and ignoring unit semantics
  const lengthCm = Number(unvalidated.length); // If actually inches, this underestimates size
  const widthCm = Number(unvalidated.width);
  const heightCm = Number(unvalidated.height);
  const weightKg = Number(unvalidated.weight); // If actually pounds, this underestimates weight

  // Wrong: map arbitrary service labels
  const serviceLevel = unvalidated.service === "fast" ? "express" : "standard";
  const destinationCountry = String(unvalidated.country || "US");

  const quote = await getShippingQuoteSI({
    lengthCm,
    widthCm,
    heightCm,
    weightKg,
    destinationCountry,
    serviceLevel,
  });

  // Wrong: return raw service response without output validation or shaping
  return quote;
}

// Good: fully validated inputs/outputs, explicit unit handling, consistent mapping, and robust errors.
export async function calcShippingTool(input: unknown): Promise<ShippingQuote> {
  // Input validation
  const parsed = PackageInputSchema.parse(input);

  // Normalize to SI units for the external service
  const { dimensions, weight, destinationCountry, serviceLevel } = parsed;

  const lengthCm =
    dimensions.unit === "cm"
      ? dimensions.length
      : round2(dimensions.length * 2.54);
  const widthCm =
    dimensions.unit === "cm"
      ? dimensions.width
      : round2(dimensions.width * 2.54);
  const heightCm =
    dimensions.unit === "cm"
      ? dimensions.height
      : round2(dimensions.height * 2.54);

  const weightKg =
    weight.unit === "kg" ? weight.value : round3(weight.value * 0.45359237);

  const serviceInput = {
    lengthCm,
    widthCm,
    heightCm,
    weightKg,
    destinationCountry,
    serviceLevel,
  } as const;

  const serviceQuote = await getShippingQuoteSI(serviceInput);

  // Output validation
  const quote = QuoteSchema.parse(serviceQuote);
  return quote;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
