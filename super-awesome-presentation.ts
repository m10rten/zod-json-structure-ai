import * as z from "zod";

// ============================================================================
// CORE TYPES AND INTERFACES
// ============================================================================

export interface SkiConditionsData {
  temperature: number;
  snowDepth: number;
  windSpeed: number;
  visibility: string;
  location: {
    resort: string;
    elevation: number;
  };
}

export interface PrescriptionData {
  medication: string;
  dose: number; // numeric value; unit context provided via metadata/schema
  frequency: number; // numeric value; time base via metadata/schema
  amount?: number; // numeric value; packaging unit via metadata/schema
  instructions: string;
}

export interface SchemaGenerationOptions {
  useZod: boolean;
  useMetadata: boolean;
  domain?: "ski" | "medicine";
}

export interface ValidationResult {
  success: boolean;
  data?: any;
  error?: any;
}

// ============================================================================
// PLAIN OBJECT SCHEMAS (No Zod, No Metadata) – with action name + $id
// ============================================================================

export const createPlainObjectSchema = () => ({
  name: "assessSkiWeather",
  $id: "#/action/assessSkiWeather",
  type: "object",
  properties: {
    temperature: { type: "number" },
    snowDepth: { type: "number" },
    windSpeed: { type: "number" },
    visibility: { type: "string" },
    location: {
      type: "object",
      properties: {
        resort: { type: "string" },
        elevation: { type: "number" },
      },
    },
  },
});

export const createPlainObjectSchema_Medicine = () => ({
  name: "draftPrescription",
  $id: "#/action/draftPrescription",
  type: "object",
  properties: {
    medication: { type: "string" },
    dose: { type: "number" },
    frequency: { type: "number" },
    amount: { type: "number" },
    instructions: { type: "string" },
  },
});

// ============================================================================
// ZOD SCHEMAS (Type Validation)
// ============================================================================

export const createBasicZodSchema = () =>
  z.object({
    temperature: z.number(),
    snowDepth: z.number(),
    windSpeed: z.number(),
    visibility: z.string(),
    location: z.object({
      resort: z.string(),
      elevation: z.number(),
    }),
  });

export const createBasicZodSchema_Medicine = () =>
  z.object({
    medication: z.string(),
    dose: z.number(),
    frequency: z.number(),
    amount: z.number().optional(),
    instructions: z.string(),
  });

export const createMetadataEnrichedZodSchema = () =>
  z
    .object({
      temperature: z.number().meta({
        description: "Ambient temperature (Celsius)",
        unit: "°C",
        examples: [-10, -5, 0, 5],
      }),
      snowDepth: z.number().meta({
        description: "Snow depth (centimeters)",
        unit: "cm",
        examples: [20, 45, 80, 120],
      }),
      windSpeed: z.number().meta({
        description: "Wind speed (km/h)",
        unit: "km/h",
        examples: [0, 12, 25, 40],
      }),
      visibility: z.string().meta({
        description: "Visibility",
        examples: ["excellent", "good", "fair", "poor", "zero"],
        maxLength: 20,
      }),
      location: z.object({
        resort: z.string().meta({ description: "Resort name", maxLength: 100 }),
        elevation: z
          .number()
          .meta({ description: "Elevation (meters)", unit: "m" }),
      }),
    })
    .meta({
      title: "Ski Conditions Schema (Units-Explicit)",
      description:
        "Numeric properties carry units; avoids C vs F, cm vs in, km/h vs mph ambiguity.",
      version: "2.0.0",
    });

export const createMetadataEnrichedZodSchema_Medicine = () =>
  z
    .object({
      medication: z.string().meta({
        description: "Drug name; some require weight-based dosing (mg/kg).",
        examples: ["Amoxicillin", "Gentamicin"],
      }),
      dose: z.number().meta({
        description: "Dose value; explicit unit required downstream.",
        unitChoices: ["mcg", "mg", "g"],
        recommendedUnit: "mg",
        examples: [4, 250, 500],
      }),
      frequency: z.number().meta({
        description: "Frequency value; explicit time base required.",
        frequencyUnitChoices: ["per_hour", "per_day", "per_week"],
        recommendedUnit: "per_day",
        examples: [2, 3, 4],
      }),
      amount: z
        .number()
        .optional()
        .meta({
          description: "Packaging amount; explicit unit required.",
          amountUnitChoices: ["tablet", "capsule", "ml", "pack", "strip"],
        }),
      instructions: z.string().meta({
        description: "Clear instructions: timing, duration.",
      }),
    })
    .meta({
      title: "Prescription Schema (Units-Explicit, Context-Aware)",
      description:
        "Dose/frequency/amount require explicit unit; context improves safety.",
      version: "2.0.0",
    });

// ============================================================================
// SCHEMA GENERATION LOGIC
// ============================================================================

function safeAddToRegistry(
  registry: ReturnType<typeof z.registry<{ id: string }>>,
  schema: any,
  meta: { id: string; [k: string]: unknown }
) {
  try {
    registry.add(schema, meta);
  } catch (e: any) {
    const msg = String(e?.message ?? "");
    if (msg.includes("already exists")) return;
    throw e;
  }
}

export function generateSchemaForConfiguration(
  options: SchemaGenerationOptions
) {
  const { useZod, useMetadata } = options;
  const domain = options.domain ?? "ski";

  if (!useZod && !useMetadata) {
    const schema =
      domain === "ski"
        ? createPlainObjectSchema()
        : createPlainObjectSchema_Medicine();
    return {
      type: "plain-object",
      schema,
      zodSchema: undefined,
      hasValidation: false,
      hasMetadata: false,
      domain,
    };
  }

  if (useZod && !useMetadata) {
    const zodSchema =
      domain === "ski"
        ? createBasicZodSchema()
        : createBasicZodSchema_Medicine();
    const js = z.toJSONSchema(zodSchema);
    const named = {
      name: domain === "ski" ? "assessSkiWeather" : "draftPrescription",
      $id:
        domain === "ski"
          ? "#/action/assessSkiWeather"
          : "#/action/draftPrescription",
      ...js,
    };
    return {
      type: "zod-basic",
      schema: named,
      zodSchema,
      hasValidation: true,
      hasMetadata: false,
      domain,
    };
  }

  if (!useZod && useMetadata) {
    const baseSchema =
      domain === "ski"
        ? createPlainObjectSchema()
        : createPlainObjectSchema_Medicine();
    const enhanced =
      domain === "ski"
        ? enhanceSchemaWithManualMetadata(baseSchema)
        : enhanceSchemaWithManualMetadata_Medicine(baseSchema);
    return {
      type: "manual-metadata",
      schema: enhanced,
      zodSchema: undefined,
      hasValidation: false,
      hasMetadata: true,
      domain,
    };
  }

  const zodSchema =
    domain === "ski"
      ? createMetadataEnrichedZodSchema()
      : createMetadataEnrichedZodSchema_Medicine();
  const localRegistry = z.registry<{
    id: string;
    title?: string;
    description?: string;
    examples?: unknown[];
  }>();
  const id = domain === "ski" ? "SkiConditions" : "Prescription";
  safeAddToRegistry(localRegistry, zodSchema, { id });

  const js = z.toJSONSchema(zodSchema, {
    target: "draft-2020-12",
    metadata: localRegistry,
  });
  const named = {
    name: domain === "ski" ? "assessSkiWeather" : "draftPrescription",
    $id:
      domain === "ski"
        ? "#/action/assessSkiWeather"
        : "#/action/draftPrescription",
    ...js,
  };

  return {
    type: "zod-with-metadata",
    schema: named,
    zodSchema,
    hasValidation: true,
    hasMetadata: true,
    domain,
  };
}

function enhanceSchemaWithManualMetadata(baseSchema: any) {
  return {
    ...baseSchema,
    $schema: "https://json-structure.org/meta/extended/v0/#",
    $uses: ["JSONStructureUnits"],
    title: "Basic Ski Conditions with Manual Metadata",
    properties: {
      ...baseSchema.properties,
      temperature: {
        type: "number",
        unit: "°C",
        description: "Temperature (Celsius)",
      },
      snowDepth: { type: "number", unit: "cm", description: "Snow depth (cm)" },
      windSpeed: {
        type: "number",
        unit: "km/h",
        description: "Wind speed (km/h)",
      },
      visibility: { type: "string", description: "Visibility" },
      location: {
        ...baseSchema.properties.location,
        properties: {
          ...baseSchema.properties.location.properties,
          elevation: {
            type: "number",
            unit: "m",
            description: "Elevation (m)",
          },
        },
      },
    },
  };
}

function enhanceSchemaWithManualMetadata_Medicine(baseSchema: any) {
  return {
    ...baseSchema,
    $schema: "https://json-structure.org/meta/extended/v0/#",
    $uses: ["JSONStructureUnits"],
    title: "Basic Prescription with Manual Metadata",
    $defs: {
      Dose: {
        type: "number",
        description: "Dose value; unit required (mcg/mg/g).",
      },
    },
    properties: {
      ...baseSchema.properties,
      dose: {
        $ref: "#/$defs/Dose",
        unitChoices: ["mcg", "mg", "g"],
        recommendedUnit: "mg",
      },
      frequency: {
        type: "number",
        description: "Frequency value; time base required (per_hour/day/week).",
        frequencyUnitChoices: ["per_hour", "per_day", "per_week"],
        recommendedUnit: "per_day",
      },
      amount: {
        type: "number",
        description:
          "Packaging amount; unit required (tablet/capsule/ml/pack/strip).",
        amountUnitChoices: ["tablet", "capsule", "ml", "pack", "strip"],
      },
      instructions: {
        ...baseSchema.properties.instructions,
        description: "Clear instructions: timing, duration.",
      },
    },
  };
}

// ============================================================================
// VALIDATION LOGIC
// ============================================================================

export function validateDataWithSchema(
  data: any,
  schemaResult: ReturnType<typeof generateSchemaForConfiguration>
): ValidationResult {
  if (!schemaResult.hasValidation) return { success: true, data };
  if (schemaResult.zodSchema) {
    const result = schemaResult.zodSchema.safeParse(data);
    return {
      success: result.success,
      data: result.success ? result.data : undefined,
      error: result.success ? undefined : result.error,
    };
  }
  return { success: true, data };
}

// ============================================================================
// AI DECISION SIMULATION + DIALOG ANSWERS
// ============================================================================

export function simulateAIDecision_WithoutMetadata_Ski(
  data: SkiConditionsData
): string {
  return [
    "🤖 AI (No Context | Ski):",
    `- Temp: ${data.temperature} (unit unknown)`,
    `- Snow: ${data.snowDepth} (unit unknown)`,
    `- Wind: ${data.windSpeed} (unit unknown)`,
    "",
    "⚠️ Ambiguous units block safe decision-making.",
  ].join("\n");
}

export function simulateAIDecision_WithMetadata_Ski(
  data: SkiConditionsData,
  schema: any
): string {
  const uT = schema.properties?.temperature?.unit || "?";
  const uS = schema.properties?.snowDepth?.unit || "?";
  const uW = schema.properties?.windSpeed?.unit || "?";
  const uE = schema.properties?.location?.properties?.elevation?.unit || "?";
  return [
    "🤖 AI (With Metadata | Ski):",
    `- Temp: ${data.temperature}${uT}`,
    `- Snow: ${data.snowDepth}${uS}`,
    `- Wind: ${data.windSpeed}${uW}`,
    `- Elev: ${data.location.elevation}${uE}`,
    "",
    "✅ Units explicit → safer judgment.",
  ].join("\n");
}

// Dialog-style “final answer” for Ski
export function aiAnswer_Ski_NoMetadata(data: SkiConditionsData): string {
  // Intentionally wrong assumption: treat temperature as Fahrenheit if >= 25
  const assumedC =
    data.temperature >= 25
      ? (data.temperature - 32) * (5 / 9)
      : data.temperature;
  const good = assumedC <= 0 && data.snowDepth >= 30 && data.windSpeed <= 35;
  const verdict = good ? "Yes" : "No";
  const note =
    data.temperature >= 25 ? "(assumed °F; could be wrong)" : "(unknown unit)";
  return `AI: ${verdict}. ${note}`;
}

export function aiAnswer_Ski_WithMetadata(
  data: SkiConditionsData,
  schema: any
): string {
  const uT = schema.properties?.temperature?.unit || "°C";
  const uS = schema.properties?.snowDepth?.unit || "cm";
  const uW = schema.properties?.windSpeed?.unit || "km/h";
  const good =
    data.temperature <= 0 && data.snowDepth >= 30 && data.windSpeed <= 35;
  const verdict = good ? "Yes" : "No";
  return `AI: ${verdict}. (temp<=0${uT}, snow>=30${uS}, wind<=35${uW})`;
}

export function simulateAIDecision_WithoutMetadata_Medicine(
  data: PrescriptionData
): string {
  return [
    "🤖 AI (No Context | Medicine):",
    `- Dose: ${data.dose} (mcg/mg/g?)`,
    `- Freq: ${data.frequency} (per_?)`,
    `- Amount: ${data.amount ?? "(unspecified)"} (unit?)`,
    `- Note: Missing units/context → unsafe.`,
  ].join("\n");
}

export function simulateAIDecision_WithMetadata_Medicine(
  data: PrescriptionData,
  schema: any
): string {
  const props = schema.properties ?? {};
  const d = props.dose || {};
  const f = props.frequency || {};
  const a = props.amount || {};
  const doseUnit = d.recommendedUnit ?? d.unit ?? "(unit?)";
  const freqUnit =
    f.recommendedUnit ??
    (Array.isArray(f.frequencyUnitChoices)
      ? f.frequencyUnitChoices[0]
      : "(per_?)");
  const amtUnit = Array.isArray(a.amountUnitChoices)
    ? a.amountUnitChoices[0]
    : "(unit?)";
  return [
    "🤖 AI (With Metadata | Medicine):",
    `- Dose: ${data.dose} ${doseUnit}`,
    `- Freq: ${data.frequency} ${freqUnit}`,
    `- Amount: ${data.amount ?? "(unspecified)"} ${
      data.amount ? amtUnit : ""
    }`.trim(),
    "",
    "✅ Explicit units/context → safer output.",
  ].join("\n");
}

// Dialog-style “final answer” for Medicine
export function aiAnswer_Med_NoMetadata(_data: PrescriptionData): string {
  // Risky approval due to ambiguity
  return "AI: Approved. (assumed mg and per_day — ambiguous!)";
}

export function aiAnswer_Med_WithMetadata(
  data: PrescriptionData,
  schema: any
): string {
  const props = schema.properties ?? {};
  const doseUnit = props.dose?.recommendedUnit ?? "mg";
  const freqUnit = props.frequency?.recommendedUnit ?? "per_day";
  const amtUnit = Array.isArray(props.amount?.amountUnitChoices)
    ? props.amount.amountUnitChoices[0]
    : "tablet";
  return `AI: OK. ${data.dose} ${doseUnit}, ${data.frequency} ${freqUnit}, ${
    data.amount ?? 1
  } ${amtUnit}.`;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Accept either SchemaGenerationOptions or the generated schema result object.
// This fixes demo slides showing "Plain Objects" when they passed the result object instead of options.
export function getConfigurationDescription(
  input:
    | SchemaGenerationOptions
    | {
        type?: string;
        hasValidation?: boolean;
        hasMetadata?: boolean;
        domain?: "ski" | "medicine";
      }
): string {
  // Detect result-object shape
  if (
    input &&
    (typeof (input as any).hasValidation === "boolean" ||
      typeof (input as any).hasMetadata === "boolean" ||
      typeof (input as any).type === "string")
  ) {
    const { type, hasValidation, hasMetadata, domain } = input as any;
    const d = domain ?? "ski";
    if (type) {
      switch (type) {
        case "plain-object":
          return `Plain Objects (no validation, no metadata) | domain: ${d}`;
        case "zod-basic":
          return `Zod Validation (type-safe, no metadata) | domain: ${d}`;
        case "manual-metadata":
          return `Manual Metadata (no validation, basic metadata) | domain: ${d}`;
        case "zod-with-metadata":
          return `Full Implementation (Zod validation + JSON Structure metadata) | domain: ${d}`;
      }
    }
    // Fallback by flags
    if (hasValidation && hasMetadata)
      return `Full Implementation (Zod validation + JSON Structure metadata) | domain: ${d}`;
    if (hasValidation && !hasMetadata)
      return `Zod Validation (type-safe, no metadata) | domain: ${d}`;
    if (!hasValidation && hasMetadata)
      return `Manual Metadata (no validation, basic metadata) | domain: ${d}`;
    return `Plain Objects (no validation, no metadata) | domain: ${d}`;
  }

  // Original options-based behavior
  const { useZod, useMetadata } = input as SchemaGenerationOptions;
  const d = (input as any).domain ?? "ski";
  if (!useZod && !useMetadata)
    return `Plain Objects (no validation, no metadata) | domain: ${d}`;
  if (useZod && !useMetadata)
    return `Zod Validation (type-safe, no metadata) | domain: ${d}`;
  if (!useZod && useMetadata)
    return `Manual Metadata (no validation, basic metadata) | domain: ${d}`;
  return `Full Implementation (Zod validation + JSON Structure metadata) | domain: ${d}`;
}

// Robust: handle both function and object shapes to avoid runtime error
function extractZodMetaPreview(zodObject: any, keys: string[]) {
  const def = zodObject?._def;
  let shapeVal: any;
  if (def && typeof def.shape === "function") {
    shapeVal = def.shape();
  } else if (def && def.shape && typeof def.shape === "object") {
    shapeVal = def.shape;
  } else if (
    zodObject &&
    (zodObject as any).shape &&
    typeof (zodObject as any).shape === "object"
  ) {
    shapeVal = (zodObject as any).shape;
  } else {
    shapeVal = {};
  }
  const out: Record<string, any> = {};
  for (const k of keys) {
    const prop = shapeVal?.[k];
    const meta =
      typeof prop?.meta === "function" ? prop.meta() : prop?._def?.meta ?? {};
    out[k] = meta;
  }
  return out;
}

// Action-oriented preview (instead of raw properties)
export function getSchemaPreview(
  schema: any,
  _hasMetadata: boolean,
  domain: "ski" | "medicine"
) {
  const props = schema.properties ?? {};
  if (domain === "ski") {
    return {
      action: {
        name: schema.name ?? "assessSkiWeather",
        $id: schema.$id ?? "#/action/assessSkiWeather",
        description: "Assess ski weather conditions",
        parameters: {
          temperature: paramsFrom(props.temperature),
          snowDepth: paramsFrom(props.snowDepth),
          windSpeed: paramsFrom(props.windSpeed),
          visibility: paramsFrom(props.visibility),
          location: paramsFrom(props.location),
        },
      },
    };
  }
  return {
    action: {
      name: schema.name ?? "draftPrescription",
      $id: schema.$id ?? "#/action/draftPrescription",
      description: "Draft a prescription with explicit units",
      parameters: {
        medication: paramsFrom(props.medication),
        dose: paramsFrom(props.dose),
        frequency: paramsFrom(props.frequency),
        amount: paramsFrom(props.amount),
        instructions: paramsFrom(props.instructions),
      },
    },
  };
}

function paramsFrom(p: any) {
  if (!p) return { type: "unknown" };
  const base: any = { type: p.type ?? (p.enum ? "string" : typeof p) };
  if (p.unit) base.unit = p.unit;
  if (p.unitChoices) base.unitChoices = p.unitChoices;
  if (p.recommendedUnit) base.recommendedUnit = p.recommendedUnit;
  if (p.frequencyUnitChoices)
    base.frequencyUnitChoices = p.frequencyUnitChoices;
  if (p.amountUnitChoices) base.amountUnitChoices = p.amountUnitChoices;
  if (p.description) base.description = p.description;
  if (p.$ref) base.$ref = p.$ref;
  return base;
}

// ============================================================================
// PRESENTATION FLOW (CLI) - Space/Right -> next, Left -> back, 'q' quit
// ============================================================================

function clearConsole() {
  process.stdout.write("\x1Bc");
}

type Slide = { title: string; render: () => Promise<void> };

// Counter to generate unique IDs for slide 4 demo to avoid duplicate-id errors
let demoIdCounter = 0;

/**
 * Slides (concise, bad → good demo order):
 * 0: Intro
 * 1: Why metadata (what metadata can include)
 * 2: Importance of metadata
 * 3: What is JSON Schema (short)
 * 4: JSON Schema Example (Simple Zod → JSON Schema with $ref + name)
 * 5: How Zod comes in (author -> registry -> JSON Schema -> AI/validation)
 * 6: Output Quality Ladder (Worst → Good)
 * 7: Demo Outline
 * 8: Demo — Ski (Plain / bad)
 * 9: Demo — Ski (Manual metadata / better)
 * 10: Demo — Medicine (Ambiguous / bad)
 * 11: Demo — Medicine (Good with metadata / best)
 * 12: Conclusion
 * 13: End
 */
export async function runPresentationFlow() {
  const slides: Slide[] = [];

  slides.push({
    title: "Slide 0: Introduction",
    render: async () => {
      console.log(`
Using Zod Metadata, Registries, and JSON Schema to guide AI I/O

----

Contents:
- Why property metadata (units/context) prevents ambiguity
- JSON Schema basics + example
- How Zod connects authoring → prompting → validation
- Demo: bad → good (Ski, Medicine)
      `);
    },
  });

  slides.push({
    title: "Slide 1: Why metadata (what it can include)",
    render: async () => {
      console.log(`
Metadata fields per property:
- description, examples
- unit (°C, mg), unitChoices (mcg|mg|g), recommendedUnit
- frequencyUnitChoices (per_hour|per_day|per_week)
- amountUnitChoices (tablet|ml|pack|strip)
- id/title for linking and references

----

Purpose:
- Remove ambiguity, enable validation, guide AI to consistent outputs
      `);
    },
  });

  slides.push({
    title: "Slide 2: Importance of metadata",
    render: async () => {
      console.log(`
Explicit property intent:
- Temperature must include unit (C/F)
- Dose must include unit (mcg/mg/g)
- Frequency must include base (per_day)
- Amount must include packaging (tablet/ml)

----

Outcome:
- Safer automation, fewer errors, clearer contracts
      `);
    },
  });

  slides.push({
    title: "Slide 3: What is JSON Schema (short)",
    render: async () => {
      console.log(`
JSON Schema:
- A standard to describe JSON structure, constraints, and refs ($ref/$defs)
- Used to validate data and guide LLM structured output

----

We will show a tiny example next (1 property + a link)
      `);
    },
  });

  // Simple Zod with 1 property "temperature" and a $ref link; show z.toJSONSchema output
  slides.push({
    title:
      "Slide 4: JSON Schema Example (Simple Zod → JSON Schema with $ref + name)",
    render: async () => {
      demoIdCounter++;
      const CEL_ID = `Celsius_demo_${demoIdCounter}`;
      const TEMPREAD_ID = `TempReading_demo_${demoIdCounter}`;

      const Celsius = z
        .number()
        .meta({ id: CEL_ID, description: "Temperature in °C", unit: "°C" });
      const TempReading = z
        .object({ temperature: Celsius })
        .meta({ id: TEMPREAD_ID });

      const reg = z.registry<{ id: string }>();
      safeAddToRegistry(reg, Celsius, { id: CEL_ID });
      safeAddToRegistry(reg, TempReading, { id: TEMPREAD_ID });

      const json = z.toJSONSchema(TempReading, {
        target: "draft-2020-12",
        metadata: reg,
      });
      const named = {
        name: "assessSkiTemperature",
        $id: "#/action/assessSkiTemperature",
        ...json,
      };

      const codeSnippet = `
const Celsius = z.number().meta({ id: "${CEL_ID}", description: "Temperature in °C", unit: "°C" });
const TempReading = z.object({ temperature: Celsius }).meta({ id: "${TEMPREAD_ID}" });

const reg = z.registry<{ id: string }>();
reg.add(Celsius, { id: "${CEL_ID}" });
reg.add(TempReading, { id: "${TEMPREAD_ID}" });

const json = z.toJSONSchema(TempReading, { target: "draft-2020-12", metadata: reg });
const named = { name: "assessSkiTemperature", $id: "#/action/assessSkiTemperature", ...json };`.trim();

      console.log(`
Minimal Zod with a link ($ref) and action name:

----

${codeSnippet}

----

Result (z.toJSONSchema):
${JSON.stringify(named, null, 2)}
      `);
    },
  });

  slides.push({
    title:
      "Slide 5: How Zod comes in (author → registry → JSON Schema → AI/validation)",
    render: async () => {
      console.log(`
Flow:
- Author schemas in Zod; add .meta() per property
- Register schemas in a registry (ids for linking)
- Export JSON Schema via z.toJSONSchema(schema, { metadata: registry })
- Use JSON Schema to guide LLM output and validate I/O

----

Single source of truth, end-to-end
      `);
    },
  });

  slides.push({
    title: "Slide 6: Output Quality Ladder (Worst → Good)",
    render: async () => {
      console.log(`
AI outputs from worst to best:
- Worst: Nothing (free text)
- Bad: Validation only
- OK: Validation + JSON Schema
- Good: Metadata + Descriptions (+ Registries)

----

Bonus: Codecs (wire ↔ internal)
      `);
    },
  });

  slides.push({
    title: "Slide 7: Demo Outline (bad → good)",
    render: async () => {
      console.log(`
We will walk through:
- Slide 8: Ski — Plain (bad)
- Slide 9: Ski — Manual metadata (better)
- Slide 10: Medicine — Ambiguous (bad)
- Slide 11: Medicine — Good with metadata (best)

----

Each slide shows: prompt → reasoning → concise AI answer
      `);
    },
  });

  slides.push({
    title: "Slide 8: Demo — Ski (Plain / bad)",
    render: async () => {
      const cfg = generateSchemaForConfiguration({
        useZod: false,
        useMetadata: false,
        domain: "ski",
      });
      const skiData: SkiConditionsData = {
        temperature: 30,
        snowDepth: 60,
        windSpeed: 20,
        visibility: "good",
        location: { resort: "Zermatt", elevation: 1600 },
      };
      console.log(`
${getConfigurationDescription(cfg)}

----

Action Preview (Ski):
${JSON.stringify(getSchemaPreview(cfg.schema, false, "ski"), null, 2)}

----

User: "Is it good weather to ski today?"
${simulateAIDecision_WithoutMetadata_Ski(skiData)}
${aiAnswer_Ski_NoMetadata(skiData)}
      `);
    },
  });

  slides.push({
    title: "Slide 9: Demo — Ski (Manual metadata / better)",
    render: async () => {
      const cfg = generateSchemaForConfiguration({
        useZod: false,
        useMetadata: true,
        domain: "ski",
      });
      const skiData: SkiConditionsData = {
        temperature: -3,
        snowDepth: 45,
        windSpeed: 18,
        visibility: "excellent",
        location: { resort: "Val Thorens", elevation: 2300 },
      };
      console.log(`
${getConfigurationDescription(cfg)}

----

Action Preview (Ski):
${JSON.stringify(getSchemaPreview(cfg.schema, true, "ski"), null, 2)}

----

User: "Is it good weather to ski today?"
${simulateAIDecision_WithMetadata_Ski(skiData, cfg.schema)}
${aiAnswer_Ski_WithMetadata(skiData, cfg.schema)}
      `);
    },
  });

  // Slide 10: Demo — Medicine (Ambiguous / bad) — updated
  slides.push({
    title: "Slide 10: Demo — Medicine (Ambiguous / bad)",
    render: async () => {
      const cfgBare = generateSchemaForConfiguration({
        useZod: false,
        useMetadata: false,
        domain: "medicine",
      });

      // Simulated ambiguous AI output (no units/context)
      const ambiguousRx: PrescriptionData = {
        medication: "Amoxicillin",
        dose: 4, // ambiguous (4 what?)
        frequency: 3, // ambiguous (3 per what?)
        amount: 1, // ambiguous (1 tablet/ml/pack?)
        instructions: "As needed",
      };

      console.log(`
${getConfigurationDescription(cfgBare)}

----

Action Preview (Medicine):
${JSON.stringify(getSchemaPreview(cfgBare.schema, false, "medicine"), null, 2)}

----

User: "Please draft an antibiotic prescription for an adult with sinus infection."
${simulateAIDecision_WithoutMetadata_Medicine(ambiguousRx)}
${aiAnswer_Med_NoMetadata(ambiguousRx)}
    `);
    },
  });

  // Slide 11: Demo — Medicine (Good with metadata / best) — updated
  slides.push({
    title: "Slide 11: Demo — Medicine (Good with metadata / best)",
    render: async () => {
      const cfg = generateSchemaForConfiguration({
        useZod: true,
        useMetadata: true,
        domain: "medicine",
      });

      // Show actual property-level metadata directly from Zod
      const metaPreview = extractZodMetaPreview(cfg.zodSchema, [
        "medication",
        "dose",
        "frequency",
        "amount",
      ]);

      // Simulated AI proposal that uses schema metadata conventions
      const goodRx: PrescriptionData = {
        medication: "Amoxicillin",
        dose: 500, // mg (from metadata recommendedUnit)
        frequency: 2, // per_day (from metadata)
        amount: 1, // tablet (from metadata)
        instructions: "After meals; 5 days.",
      };

      const validation = validateDataWithSchema(goodRx, cfg);
      const interpreted = simulateAIDecision_WithMetadata_Medicine(
        goodRx,
        cfg.schema
      );
      const answer = aiAnswer_Med_WithMetadata(goodRx, cfg.schema);

      console.log(`
${getConfigurationDescription(cfg)}

----

Property Metadata (from Zod):
${JSON.stringify(metaPreview, null, 2)}

----

User: "Please draft an antibiotic prescription for an adult with sinus infection."
Flow:
1) Model proposes (guided by metadata)
2) Validate proposal → ${JSON.stringify({ success: validation.success })}
3) Interpret (with metadata) →
${interpreted}
4) Final answer →
${answer}
    `);
    },
  });

  slides.push({
    title: "Slide 12: Conclusion",
    render: async () => {
      console.log(`
Takeaways:
- Property metadata (units/context) → safety + clarity
- JSON Schema → structure-first prompting + validation
- Zod + registries → single source of truth

----

Bad → good progression improves reliability
      `);
    },
  });

  slides.push({
    title: "Slide 13: End",
    render: async () => {
      console.log(`
Thanks! Use ← to revisit slides or 'q' to quit.

----

Q&A
      `);
    },
  });

  await runStepper(slides);
}

/**
 * Space/Right -> next, Left -> back, 'q' -> quit
 * Boundary-safe: at first/last slide, re-renders same slide with notice (no overshoot).
 */
async function runStepper(slides: Slide[]) {
  let index = 0;
  const total = slides.length;
  const isTTY =
    typeof process !== "undefined" &&
    (process as any).stdin &&
    (process as any).stdin.isTTY;

  const render = async (notice?: string) => {
    clearConsole();
    console.log(`[Slide ${index}/${total - 1}] ${slides[index].title}\n`);
    await slides[index].render();
    if (notice) console.log(`\n${notice}`);
    console.log(`\nControls: ← Back | → Next | Space Next | q Quit`);
  };

  const next = async () => {
    if (index < total - 1) {
      index++;
      await render();
    } else {
      await render("(Last slide)");
    }
  };

  const prev = async () => {
    if (index > 0) {
      index--;
      await render();
    } else {
      await render("(First slide)");
    }
  };

  if (!isTTY) {
    for (index = 0; index < total; index++) {
      await render();
    }
    return;
  }

  (process as any).stdin.setRawMode?.(true);
  (process as any).stdin.resume();
  (process as any).stdin.setEncoding("utf8");
  await render();

  const onData = async (key: string) => {
    if (key === "q" || key === "\u0003") {
      cleanup();
      return;
    }
    if (key === " " || key === "\u001b[C") {
      await next();
      return;
    }
    if (key === "\u001b[D") {
      await prev();
      return;
    }
  };

  const cleanup = () => {
    (process as any).stdin.setRawMode?.(false);
    (process as any).stdin.pause();
    (process as any).stdin.removeListener("data", onData);
    console.log(`Exiting presentation.`);
  };

  (process as any).stdin.on("data", onData);
}

// If you want to auto-run the presentation when executed directly:
// (Uncomment)
if (require.main === module) {
  runPresentationFlow().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
