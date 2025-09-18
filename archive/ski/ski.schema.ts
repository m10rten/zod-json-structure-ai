import { z } from "zod";

export type BaseProfile = "usa" | "intl";

type AnyZod = z.ZodTypeAny & { _def?: any };

export function getSchemaMeta(s: AnyZod): Record<string, unknown> | undefined {
  return s?._def?.meta ?? s?._def?.metadata;
}

export function getObjectShape(s: AnyZod): Record<string, AnyZod> | undefined {
  const shapeFn = s?._def?.shape;
  return typeof shapeFn === "function" ? shapeFn() : shapeFn;
}

export type BuiltSchemas = {
  SkiDataArguments: z.ZodTypeAny;
  SkiDecision: z.ZodTypeAny;
  decisionKeys: {
    tempKey: string;
    windKey: string;
    tempUnitLabel: string;
    windUnitLabel: string;
  };
};

export function buildSkiSchemas(profile: BaseProfile): BuiltSchemas {
  const tempDefault = profile === "usa" ? "°F" : "°C";
  const windDefault = profile === "usa" ? "mph" : "km/h";

  const SkiDataArguments = z
    .object({
      temperature: z
        .number()
        .describe("Ambient temperature.")
        .meta({
          unit: tempDefault,
          choices: ["°C", "°F", "K"],
          default: tempDefault,
        }),
      wind: z
        .number()
        .describe("Average wind speed.")
        .meta({
          unit: windDefault,
          choices: ["km/h", "mph"],
          default: windDefault,
        }),
      visibility: z
        .enum(["poor", "fair", "good", "excellent"])
        .describe("Visibility on a defined scale.")
        .meta({
          choices: ["poor", "fair", "good", "excellent"],
          default: "good",
        }),
    })
    .describe("SkiDataArguments");

  const tempKey = profile === "usa" ? "temperatureF" : "temperatureC";
  const windKey = profile === "usa" ? "windMph" : "windKmh";
  const tempUnitLabel = profile === "usa" ? "°F" : "°C";
  const windUnitLabel = profile === "usa" ? "mph" : "km/h";

  const dataShape: Record<string, z.ZodTypeAny> = {
    visibility: z.enum(["poor", "fair", "good", "excellent"]),
  };
  dataShape[tempKey] = z.number().describe(`Normalized ${tempUnitLabel}`);
  dataShape[windKey] = z.number().describe(`Normalized ${windUnitLabel}`);

  const SkiDecision = z
    .object({
      decision: z.enum(["yes", "no", "maybe"]).describe("Is it good to ski?"),
      reason: z.string().min(1).describe("Short explanation."),
      data: z.object(dataShape),
    })
    .describe("SkiDecision");

  return {
    SkiDataArguments,
    SkiDecision,
    decisionKeys: { tempKey, windKey, tempUnitLabel, windUnitLabel },
  };
}
