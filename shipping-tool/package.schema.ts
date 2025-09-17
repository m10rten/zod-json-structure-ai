// src/schemas/package.schema.ts
// Zod v4 schemas with metadata and JSON Schema conversion.
// Uses Zod registries/metadata so docs and JSON Schema include helpful context.
// Docs: Zod JSON Schema conversion and metadata registries. z.toJSONSchema + z.globalRegistry

import { z } from "zod";

export const LengthUnitSchema = z
  .enum(["cm", "in"])
  .describe("Unit for dimensions: centimeters (cm) or inches (in).");

export const WeightUnitSchema = z
  .enum(["kg", "lb"])
  .describe("Unit for weight: kilograms (kg) or pounds (lb).");

export const DimensionsSchema = z
  .object({
    length: z.number().positive().describe("Package length (> 0)."),
    width: z.number().positive().describe("Package width (> 0)."),
    height: z.number().positive().describe("Package height (> 0)."),
    unit: LengthUnitSchema,
  })
  .describe("Physical dimensions of the package.");

// Input DTO
export const PackageInputSchema = z
  .object({
    dimensions: DimensionsSchema,
    weight: z
      .object({
        value: z.number().positive().describe("Measured weight (> 0)."),
        unit: WeightUnitSchema,
      })
      .describe("Actual measured weight."),
    destinationCountry: z
      .string()
      .regex(/^[A-Z]{2}$/)
      .describe("Destination ISO-3166 alpha-2 country code."),
    serviceLevel: z
      .enum(["standard", "express"])
      .describe("Requested service level."),
  })
  .describe("Input for calculating a shipping quote.");

// Attach helpful metadata for docs/AI/JSON Schema
PackageInputSchema.register(z.globalRegistry, {
  id: "PackageInput",
  title: "Shipping Package Input",
  description:
    "Defines a shipping package with dimensions and weight including explicit units, plus destination and service level.",
});

// Output DTO
export const QuoteSchema = z
  .object({
    cost: z.number().nonnegative().describe("Total quoted cost."),
    currency: z.literal("USD").describe("Currency code."),
    estimatedDays: z
      .number()
      .int()
      .positive()
      .describe("Estimated transit days."),
    usedBillableWeightKg: z
      .number()
      .positive()
      .describe("Billable weight used (kg)."),
    breakdown: z
      .array(
        z.object({
          label: z.string(),
          amount: z.number(),
        })
      )
      .describe("Line-item cost breakdown."),
  })
  .describe("Resulting shipping quote.");

QuoteSchema.register(z.globalRegistry, {
  id: "ShippingQuote",
  title: "Shipping Quote",
  description: "Computed quote for shipping the given package.",
});

// JSON Schema exports (generated from Zod v4)
export const packageInputJsonSchema = z.toJSONSchema(PackageInputSchema);
export const quoteJsonSchema = z.toJSONSchema(QuoteSchema);

export type PackageInput = z.infer<typeof PackageInputSchema>;
export type ShippingQuote = z.infer<typeof QuoteSchema>;
