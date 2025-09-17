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

export interface SchemaGenerationOptions {
  useZod: boolean;
  useMetadata: boolean;
}

export interface ValidationResult {
  success: boolean;
  data?: any;
  error?: any;
}

// ============================================================================
// PLAIN OBJECT SCHEMAS (No Zod, No Metadata)
// ============================================================================

/**
 * Basic JSON Schema without any metadata or type validation
 * This represents the minimal schema most systems use
 */
export const createPlainObjectSchema = () => ({
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

// ============================================================================
// ZOD SCHEMAS (Type Validation)
// ============================================================================

/**
 * Zod schema with type validation but no metadata
 * Provides runtime type safety but lacks context for AI systems
 */
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

/**
 * Zod schema with comprehensive JSON Structure metadata
 * Provides both type validation AND semantic context for AI systems
 */
export const createMetadataEnrichedZodSchema = () =>
  z
    .object({
      temperature: z.number().meta({
        description:
          "Temperature in Celsius - critical for skiing safety assessment",
        unit: "°C",
        precision: 3,
        scale: 1,
        examples: [-10, -5, 0, 5],
      }),
      snowDepth: z.number().meta({
        description: "Snow depth measurement for skiing quality evaluation",
        unit: "cm",
        precision: 3,
        scale: 0,
        examples: [20, 45, 80, 120],
      }),
      windSpeed: z.number().meta({
        description: "Wind speed affecting skiing conditions and safety",
        unit: "km/h",
        precision: 3,
        scale: 1,
        examples: [0, 12, 25, 40],
      }),
      visibility: z.string().meta({
        description: "Visibility conditions impacting skiing safety",
        examples: ["excellent", "good", "fair", "poor", "zero"],
        maxLength: 20,
      }),
      location: z.object({
        resort: z.string().meta({
          description: "Name of the ski resort or location",
          maxLength: 100,
        }),
        elevation: z.number().meta({
          description: "Resort elevation affecting weather and snow conditions",
          unit: "m",
          precision: 4,
          scale: 0,
        }),
      }),
    })
    .meta({
      id: "ski-conditions-v1",
      title: "Comprehensive Ski Conditions Schema",
      description:
        "Complete skiing conditions with units, safety context, and validation rules",
      version: "1.0.0",
    });

// ============================================================================
// SCHEMA GENERATION LOGIC
// ============================================================================

/**
 * Generates appropriate schema based on configuration options
 * Demonstrates the progression from basic to metadata-rich schemas
 */
export function generateSchemaForConfiguration(
  options: SchemaGenerationOptions
) {
  const { useZod, useMetadata } = options;

  if (!useZod && !useMetadata) {
    // Configuration 1: Plain objects only
    return {
      type: "plain-object",
      schema: createPlainObjectSchema(),
      hasValidation: false,
      hasMetadata: false,
    };
  }

  if (useZod && !useMetadata) {
    // Configuration 2: Zod validation without metadata
    const zodSchema = createBasicZodSchema();
    return {
      type: "zod-basic",
      schema: z.toJSONSchema(zodSchema),
      zodSchema,
      hasValidation: true,
      hasMetadata: false,
    };
  }

  if (!useZod && useMetadata) {
    // Configuration 3: Manual metadata without Zod validation
    const baseSchema = createPlainObjectSchema();
    return {
      type: "manual-metadata",
      schema: enhanceSchemaWithManualMetadata(baseSchema),
      hasValidation: false,
      hasMetadata: true,
    };
  }

  // Configuration 4: Full Zod + JSON Structure metadata
  const zodSchema = createMetadataEnrichedZodSchema();
  z.globalRegistry.add(zodSchema, { id: "SkiConditions" });

  return {
    type: "zod-with-metadata",
    schema: z.toJSONSchema(zodSchema, {
      target: "draft-2020-12",
      metadata: z.globalRegistry,
    }),
    zodSchema,
    hasValidation: true,
    hasMetadata: true,
  };
}

/**
 * Manually adds basic metadata to a plain schema
 * Shows how metadata can be added without Zod
 */
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
        description: "Temperature in Celsius",
      },
      snowDepth: {
        type: "number",
        unit: "cm",
        description: "Snow depth in centimeters",
      },
      windSpeed: {
        type: "number",
        unit: "km/h",
        description: "Wind speed in kilometers per hour",
      },
      visibility: {
        type: "string",
        description: "Visibility conditions",
      },
      location: {
        ...baseSchema.properties.location,
        properties: {
          ...baseSchema.properties.location.properties,
          elevation: {
            type: "number",
            unit: "m",
            description: "Resort elevation in meters",
          },
        },
      },
    },
  };
}

// ============================================================================
// VALIDATION LOGIC
// ============================================================================

/**
 * Validates data using the appropriate method based on schema type
 */
export function validateDataWithSchema(
  data: SkiConditionsData,
  schemaResult: ReturnType<typeof generateSchemaForConfiguration>
): ValidationResult {
  if (!schemaResult.hasValidation) {
    // No validation available - assume data is valid
    return { success: true, data };
  }

  if (schemaResult.zodSchema) {
    // Use Zod validation
    const result = schemaResult.zodSchema.safeParse(data);
    return {
      success: result.success,
      data: result.success ? result.data : undefined,
      error: result.success ? undefined : result.error,
    };
  }

  // Fallback - no validation method available
  return { success: true, data };
}

// ============================================================================
// AI DECISION SIMULATION
// ============================================================================

/**
 * Simulates AI decision-making WITHOUT metadata context
 * Shows how AI must guess at units and meaning
 */
export function simulateAIDecision_WithoutMetadata(
  data: SkiConditionsData
): string {
  return [
    "🤖 AI Analysis (No Context):",
    `   Temperature: ${data.temperature} (units unknown - could be °C, °F, or K!)`,
    `   Snow: ${data.snowDepth} (cm? inches? feet?)`,
    `   Wind: ${data.windSpeed} (km/h? mph? m/s?)`,
    "",
    "⚠️  Without units, I cannot assess skiing safety!",
    "   If ${data.temperature} is Fahrenheit, conditions are dangerous.",
    "   If ${data.temperature} is Celsius, conditions might be perfect.",
  ].join("\n");
}

/**
 * Simulates AI decision-making WITH metadata context
 * Shows how metadata enables accurate interpretation
 */
export function simulateAIDecision_WithMetadata(
  data: SkiConditionsData,
  schema: any
): string {
  // Extract units from schema metadata
  const tempUnit = schema.properties?.temperature?.unit || "unknown";
  const snowUnit = schema.properties?.snowDepth?.unit || "unknown";
  const windUnit = schema.properties?.windSpeed?.unit || "unknown";
  const elevationUnit =
    schema.properties?.location?.properties?.elevation?.unit || "unknown";

  return [
    "🤖 AI Analysis (With Metadata):",
    `   Temperature: ${data.temperature}${tempUnit} - Perfect skiing temperature!`,
    `   Snow Depth: ${data.snowDepth}${snowUnit} - Excellent powder conditions`,
    `   Wind Speed: ${data.windSpeed}${windUnit} - Light winds, great visibility`,
    `   Elevation: ${data.location.elevation}${elevationUnit} - Optimal altitude for snow quality`,
    "",
    "✅ Assessment: EXCELLENT skiing conditions!",
    "   All parameters are in safe ranges with proper units specified.",
  ].join("\n");
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Creates a formatted configuration summary
 */
export function getConfigurationDescription(
  options: SchemaGenerationOptions
): string {
  const { useZod, useMetadata } = options;

  if (!useZod && !useMetadata)
    return "Plain Objects (no validation, no metadata)";
  if (useZod && !useMetadata) return "Zod Validation (type-safe, no metadata)";
  if (!useZod && useMetadata)
    return "Manual Metadata (no validation, basic metadata)";
  return "Full Implementation (Zod validation + JSON Structure metadata)";
}

/**
 * Extracts key schema properties for display
 */
export function getSchemaPreview(schema: any, hasMetadata: boolean) {
  if (!hasMetadata) {
    return {
      temperature: { type: "number" },
      snowDepth: { type: "number" },
      windSpeed: { type: "number" },
    };
  }

  return {
    temperature: schema.properties?.temperature || { type: "number" },
    snowDepth: schema.properties?.snowDepth || { type: "number" },
    windSpeed: schema.properties?.windSpeed || { type: "number" },
  };
}
