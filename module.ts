// ============================================================================
// CORE TYPES AND INTERFACES
// ============================================================================

import { z } from "zod";

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

export function safeAddToRegistry(
  registry: ReturnType<typeof z.registry<{ id: string }>>,
  schema: any,
  meta: { id: string; [k: string]: unknown }
) {
  try {
    return registry.add(schema, meta);
  } catch {}
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
export function extractZodMetaPreview(zodObject: any, keys: string[]) {
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
