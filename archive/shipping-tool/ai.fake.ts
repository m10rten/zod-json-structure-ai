// src/ai.fake.ts
// Fake AI "SDK-like" wrapper that mimics generateObject({ prompt, schema? }).

type GenerateObjectOptions = {
  prompt: string;
  // Optional Zod-like schema type: we won't import Zod here to keep this file standalone.
  // The caller can pass any object and we only use the presence of it to switch behavior.
  schema?: unknown;
  schemaName?: string;
};

type GenerateObjectResult<T = unknown> = Promise<{
  object: T;
  text: string;
}>;

function extractNumbersFromPrompt(prompt: string) {
  // Extremely naive parser for the demo; looks for patterns like "20x15x10" and "5 lb"
  // and two-letter country code. If not found, returns some fallback numbers.
  const dimMatch = prompt.match(/(\d+)\s*x\s*(\d+)\s*x\s*(\d+)/i);
  const weightMatch = prompt.match(/(\d+(\.\d+)?)\s*(lb|pound|kg|kilogram)/i);
  const countryMatch = prompt.match(/\b([A-Z]{2})\b/);

  const length = dimMatch ? Number(dimMatch[1]) : 30;
  const width = dimMatch ? Number(dimMatch[2]) : 20;
  const height = dimMatch ? Number(dimMatch[3]) : 10;

  let weight = 5;
  let weightUnit: "lb" | "kg" = "lb";
  if (weightMatch) {
    weight = Number(weightMatch[1]);
    weightUnit = /kg|kilogram/i.test(weightMatch[3]) ? "kg" : "lb";
  }

  const destinationCountry = countryMatch ? countryMatch[1] : "US";
  const express = /express|fast/i.test(prompt) ? "express" : "standard";

  // Heuristic: if 'inch' is mentioned, assume inches, else cm
  const lengthUnit: "in" | "cm" = /inch|inches|in\b/i.test(prompt)
    ? "in"
    : "cm";

  return {
    length,
    width,
    height,
    lengthUnit,
    weight,
    weightUnit,
    destinationCountry,
    express,
  };
}

const ai = {
  async generateObject<T = any>(
    options: GenerateObjectOptions
  ): GenerateObjectResult<T> {
    const { prompt, schema } = options;

    const parsed = extractNumbersFromPrompt(prompt);

    // Without a schema: return ambiguous, messy, and error-prone structure
    if (!schema) {
      const badObject: any = {
        // ambiguous fields; strings mixed with numbers; odd unit label
        length: String(parsed.length),
        width: parsed.width, // number but no unit
        height: parsed.height, // number but no unit
        unit: parsed.lengthUnit === "in" ? "imperial" : "metric", // vague
        weight: String(parsed.weight),
        weightUnit: parsed.weightUnit === "lb" ? "pounds" : "kilos", // inconsistent
        country: parsed.destinationCountry,
        service: parsed.express === "express" ? "fast" : "normal",
      };

      return {
        object: badObject as T,
        text: JSON.stringify(badObject),
      };
    }

    // With a schema: return a well-structured, explicit object aligned to the intended shape.
    // We'll standardize field names and known enums that our Zod schema expects.
    const goodObject: any = {
      dimensions: {
        length: parsed.length,
        width: parsed.width,
        height: parsed.height,
        unit: parsed.lengthUnit, // 'cm' | 'in'
      },
      weight: {
        value: parsed.weight,
        unit: parsed.weightUnit, // 'kg' | 'lb'
      },
      destinationCountry: parsed.destinationCountry, // 'DE' for Germany, etc.
      serviceLevel: parsed.express, // 'express' | 'standard'
    };

    return {
      object: goodObject as T,
      text: JSON.stringify(goodObject),
    };
  },
};

export default ai;
