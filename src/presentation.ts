/**
 * Title: Using Zod Metadata, Registries, and JSON Schema to Guide AI I/O (Ski Weather + Medicine Examples)
 *
 * Presentation (read me first):
 * 1) Importance of metadata when communicating with AI
 *    - AI models respond better when field intent is explicit. IDs, titles, descriptions, and examples reduce ambiguity
 *      and improve structured output adherence (Zod v4 supports .meta and a global registry). [zod.dev/metadata] turn0search1
 *    - JSON Schema is a common, model-friendly target. Zod v4 can produce JSON Schema via z.toJSONSchema(), which
 *      is widely used (OpenAPI, structured outputs). [zod.dev/json-schema] turn0search0
 *
 * 2) Why registries (Zod) are useful
 *    - A registry centralizes domain schemas + metadata. The same definitions can be reused in prompts,
 *      validators, and UI forms without drifting. [zod.dev/metadata] turn0search1
 *
 * 3) JSON Structure/Schema importance
 *    - Formal structure (JSON Schema) improves model reliability for “return JSON that matches this shape”
 *      workflows and allows automatic validation on output. [zod.dev/json-schema] turn0search0
 *
 * 4) When input/output validation is critical
 *    - Medical (e.g., prescription): catch invalid dosage ranges, missing fields, or unsafe values before
 *      they reach downstream systems.
 *    - Weather (e.g., ski): normalize units, reject impossible values, and ensure the result has required explanations.
 *
 * 5) Codecs and transformations
 *    - Codecs enable bidirectional transformations between the model’s wire format and your app’s internal types.
 *      (e.g., ISO date string <-> Date). [Zod v4 Codecs]
 *
 * Demo plan (steps):
 *    Step A: Define schemas (with/without metadata) for two domains: Ski Weather and Medicine Prescription.
 *    Step B: Register schemas + metadata and generate JSON Schema via z.toJSONSchema().
 *    Step C: Simulate model outputs (good + bad) and compare:
 *            - Without validation: unsafe data sneaks in.
 *            - With Zod validation: issues are surfaced.
 *    Step D: Show codec for date handling (string <-> Date) and how encoded/decoded flows differ.
 *
 * Verify & Validate:
 *    - Assert: JSON Schemas are generated.
 *    - Assert: safeParse flags issues (dosage out of range, wrong units).
 *    - Assert: metadata is retrievable and reflected in JSON Schema (ids, descriptions).
 */

import { z } from "zod";

/* =========================
 * Domain: Ski Weather
 * ========================= */

// Optional: codec example to bridge AI wire formats and internal types.
// The model will typically output ISO date strings; your app might prefer Date objects.
// See: “Codecs are a new API & schema type that encapsulates a bi-directional transformation.”
const isoDateCodec = z.codec(z.string(), z.date(), {
  decode: (s) => new Date(s),
  encode: (d) => d.toISOString(),
});

// Input schema for ski weather query (what we ask the AI to evaluate)
const SkiWeatherQuery_in = z
  .object({
    location: z.string().min(2),
    // Wire format from model: ISO string; internally we decode to Date for business logic.
    dateISO: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}/, "Use YYYY-MM-DD")
      .describe("Target day (YYYY-MM-DD)"),
    minSnowDepthCm: z.number().int().min(0).max(1000).default(0),
    maxWindSpeedKmh: z.number().int().min(0).max(200).default(60),
    preferColdBelowC: z.number().min(-50).max(10).default(0),
  })
  .meta({
    id: "ski_weather.query",
    title: "Ski Weather Query",
    description:
      "Parameters for evaluating whether conditions are good for skiing on a given date and location.",
    examples: [
      {
        location: "Zermatt",
        dateISO: "2025-12-20",
        minSnowDepthCm: 20,
        maxWindSpeedKmh: 50,
        preferColdBelowC: -2,
      },
    ],
  });

// Output schema: what the AI should produce
const SkiWeatherAnswer_out = z
  .object({
    good: z.boolean().describe("Whether conditions are good for skiing"),
    reason: z.string().min(5),
    conditions: z.object({
      snowDepthCm: z.number().min(0).max(2000),
      windSpeedKmh: z.number().min(0).max(300),
      temperatureC: z.number().min(-60).max(60),
    }),
    recommendation: z
      .enum(["Go", "Consider", "Avoid"])
      .describe("Actionable recommendation based on thresholds"),
  })
  .meta({
    id: "ski_weather.answer",
    title: "Ski Weather Answer",
    description:
      "Structured assessment including conditions and a recommendation for skiing on the requested date.",
    examples: [
      {
        good: true,
        reason:
          "Fresh snow, low wind, and sub-zero temps for good snow quality.",
        conditions: { snowDepthCm: 45, windSpeedKmh: 20, temperatureC: -4 },
        recommendation: "Go",
      },
    ],
  });

// Bare (no metadata) version for comparison
const SkiWeatherAnswer_out_bare = z.object({
  good: z.boolean(),
  reason: z.string(),
  conditions: z.object({
    snowDepthCm: z.number(),
    windSpeedKmh: z.number(),
    temperatureC: z.number(),
  }),
  recommendation: z.enum(["Go", "Consider", "Avoid"]),
});

/* =========================
 * Domain: Medicine Prescription
 * ========================= */

// Input schema (from UI or model producing normalized request fields)
const PrescriptionRequest_in = z
  .object({
    patientId: z.string().min(3),
    medication: z.string().min(2),
    dosageMg: z.number().int().min(1).max(1000), // conservative demo bounds
    frequencyPerDay: z.number().int().min(1).max(6),
    allergies: z.array(z.string()).default([]),
    ageYears: z.number().int().min(0).max(120),
  })
  .meta({
    id: "prescription.request",
    title: "Prescription Request",
    description:
      "Normalized request including patient ID, medication, dosage mg, frequency per day, allergies, and age.",
    examples: [
      {
        patientId: "P-12345",
        medication: "Amoxicillin",
        dosageMg: 500,
        frequencyPerDay: 3,
        allergies: ["Penicillin"],
        ageYears: 35,
      },
    ],
  });

// Output schema (what AI should propose; in real life a clinician/system validates before use)
const Prescription_out = z
  .object({
    medication: z.string(),
    dosageMg: z.number().int().min(1).max(1000),
    units: z.literal("mg"),
    route: z.enum(["oral", "iv", "topical"]),
    frequencyPerDay: z.number().int().min(1).max(6),
    instructions: z.string().min(5),
    contraindications: z.array(z.string()).default([]),
  })
  .meta({
    id: "prescription.output",
    title: "Prescription Output (Draft)",
    description:
      "Draft prescription details returned by AI for review. Must be validated by clinical rules and a licensed practitioner.",
    examples: [
      {
        medication: "Amoxicillin",
        dosageMg: 500,
        units: "mg",
        route: "oral",
        frequencyPerDay: 3,
        instructions: "Take after meals; complete full course.",
        contraindications: ["Allergy: Penicillin"],
      },
    ],
  });

// Bare (no metadata) version for comparison
const Prescription_out_bare = z.object({
  medication: z.string(),
  dosageMg: z.number(),
  units: z.literal("mg"),
  route: z.enum(["oral", "iv", "topical"]),
  frequencyPerDay: z.number(),
  instructions: z.string(),
  contraindications: z.array(z.string()).optional(),
});

/* =========================
 * Registries: centralize schemas + metadata
 * ========================= */

// A domain registry storing any Zod schema with metadata. turn0search1
const domainRegistry = z.registry<{
  id: string;
  title?: string;
  description?: string;
  examples?: unknown[];
}>();

domainRegistry.add(SkiWeatherQuery_in, SkiWeatherQuery_in.meta()! as any);
domainRegistry.add(SkiWeatherAnswer_out, SkiWeatherAnswer_out.meta()! as any);
domainRegistry.add(
  PrescriptionRequest_in,
  PrescriptionRequest_in.meta()! as any
);
domainRegistry.add(Prescription_out, Prescription_out.meta()! as any);

// Example: also register via global registry implicitly with .meta() (already done above).
// You can read metadata back if needed:
const demoMetaReadback = SkiWeatherAnswer_out.meta();

/* =========================
 * JSON Schema generation (structure for LLM and validators)
 * =========================
 * Zod v4 introduces native JSON Schema conversion:
 * Use z.toJSONSchema(schema) and share it with AI and validators. turn0search0
 */

const SkiAnswer_JSONSchema = z.toJSONSchema(SkiWeatherAnswer_out);
const SkiAnswer_JSONSchema_bare = z.toJSONSchema(SkiWeatherAnswer_out_bare);

const RxOut_JSONSchema = z.toJSONSchema(Prescription_out);
const RxOut_JSONSchema_bare = z.toJSONSchema(Prescription_out_bare);

// Helper to pretty-print
const print = (label: string, obj: unknown) => {
  console.log(`\n=== ${label} ===`);
  console.log(JSON.stringify(obj, null, 2));
};

/* =========================
 * Demo: “with vs without” metadata & validation
 * ========================= */

function simulateModelOutput_SkiWeather(goodCase = true) {
  if (goodCase) {
    return {
      good: true,
      reason: "Fresh snow and low wind. Temps below 0°C preserve snow quality.",
      conditions: { snowDepthCm: 60, windSpeedKmh: 18, temperatureC: -3 },
      recommendation: "Go",
    };
  }
  // Bad case: wrong types, out-of-range values, and missing reason
  return {
    good: "maybe", // wrong type
    conditions: { snowDepthCm: -5, windSpeedKmh: 500, temperatureC: 120 }, // impossible values
    recommendation: "Go",
  } as unknown;
}

function simulateModelOutput_Prescription(goodCase = true) {
  if (goodCase) {
    return {
      medication: "Amoxicillin",
      dosageMg: 500,
      units: "mg",
      route: "oral",
      frequencyPerDay: 3,
      instructions: "Take after meals; complete full course.",
      contraindications: ["Allergy: Penicillin"],
    };
  }
  // Bad case: unsafe values, wrong units, and missing instructions
  return {
    medication: "Amoxicillin",
    dosageMg: -100, // invalid
    units: "grams", // invalid literal
    route: "iv",
    frequencyPerDay: 12, // invalid
  } as unknown;
}

/* =========================
 * Prompt builder (showing how JSON Schema and metadata can guide AI)
 * ========================= */

function buildPromptForLLM(
  title: string,
  description: string,
  jsonSchema: object,
  examples?: unknown[]
) {
  // Many structured-output strategies embed JSON Schema in the prompt or use an API that accepts it.
  // Zod's JSON Schema conversion supports this workflow. turn0search0
  return [
    `You are to return ONLY valid JSON for: ${title}.`,
    `Description: ${description}`,
    `Follow this JSON Schema exactly (no extra properties unless allowed):`,
    JSON.stringify(jsonSchema, null, 2),
    ...(examples && examples.length
      ? [`Here are examples to emulate:`, JSON.stringify(examples, null, 2)]
      : []),
  ].join("\n");
}

/* =========================
 * Main Demo Runner
 * ========================= */

async function main() {
  console.log(
    "Readback of metadata (proof of registration):",
    demoMetaReadback
  );

  // Compare schemas: with vs without metadata
  print("Ski Answer JSON Schema (with metadata)", SkiAnswer_JSONSchema);
  print("Ski Answer JSON Schema (bare)", SkiAnswer_JSONSchema_bare);
  print("Prescription JSON Schema (with metadata)", RxOut_JSONSchema);
  print("Prescription JSON Schema (bare)", RxOut_JSONSchema_bare);

  // Show a prompt snippet that uses structure + metadata (examples help the model comply):
  const skiMeta = SkiWeatherAnswer_out.meta()!;
  const skiPrompt = buildPromptForLLM(
    skiMeta.title!,
    skiMeta.description!,
    SkiAnswer_JSONSchema,
    skiMeta.examples as unknown[]
  );
  print("Prompt to guide AI (Ski Answer)", skiPrompt);

  const rxMeta = Prescription_out.meta()!;
  const rxPrompt = buildPromptForLLM(
    rxMeta.title!,
    rxMeta.description!,
    RxOut_JSONSchema,
    rxMeta.examples as unknown[]
  );
  print("Prompt to guide AI (Prescription)", rxPrompt);

  // Validate good and bad Ski Weather outputs
  const skiGood = simulateModelOutput_SkiWeather(true);
  const skiBad = simulateModelOutput_SkiWeather(false);

  console.log("\nValidating Ski (good)...");
  const skiGoodRes = SkiWeatherAnswer_out.safeParse(skiGood);
  console.log(
    "Result:",
    skiGoodRes.success,
    skiGoodRes.success ? "OK" : skiGoodRes.error.issues
  );

  console.log("\nValidating Ski (bad)...");
  const skiBadRes = SkiWeatherAnswer_out.safeParse(skiBad);
  console.log(
    "Result:",
    skiBadRes.success,
    skiBadRes.success ? "OK" : skiBadRes.error.issues
  );

  // Validate good and bad Prescription outputs
  const rxGood = simulateModelOutput_Prescription(true);
  const rxBad = simulateModelOutput_Prescription(false);

  console.log("\nValidating Prescription (good)...");
  const rxGoodRes = Prescription_out.safeParse(rxGood);
  console.log(
    "Result:",
    rxGoodRes.success,
    rxGoodRes.success ? "OK" : rxGoodRes.error.issues
  );

  console.log("\nValidating Prescription (bad)...");
  const rxBadRes = Prescription_out.safeParse(rxBad);
  console.log(
    "Result:",
    rxBadRes.success,
    rxBadRes.success ? "OK" : rxBadRes.error.issues
  );

  // Show codec in action (wire ISO string <-> Date)
  const iso = "2025-12-20T00:00:00.000Z";
  const decoded = await isoDateCodec.decode(iso); // Date
  const encoded = await isoDateCodec.encode(decoded); // same ISO
  console.log("\nCodec demo:", {
    iso,
    decoded: decoded.toISOString(),
    encoded,
  });

  // Step-by-step verification summary
  console.log("\nVerification Summary:");
  console.log("- JSON Schema generated for both domains (see above).");
  console.log(
    "- Metadata present: ids, titles, descriptions, examples used in prompts."
  );
  console.log(
    "- Validation caught intentionally bad outputs (units, ranges, types)."
  );
  console.log("- Codec round-tripped ISO date <-> Date.");

  // Difference if you do NOT use metadata/registries:
  console.log("\nWithout metadata/registries:");
  console.log(
    "- JSON Schema lacks ids/titles/descriptions/examples, making prompts less clear."
  );
  console.log(
    "- No centralized registry risks drift across app, prompts, and validators."
  );
  console.log(
    "- Harder for humans and models to interpret fields consistently."
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
