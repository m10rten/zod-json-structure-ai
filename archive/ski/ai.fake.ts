import { z } from "zod";

export type GenerateObjectParams<T> = {
  model?: unknown; // unused; kept for interface familiarity
  schema: z.ZodType<T>;
  prompt?: string;
  run: (ctx: {
    schema: z.ZodType<T>;
    prompt?: string;
  }) => Promise<unknown> | unknown;
};

// Minimal fake: call run() to get a raw value and validate with Zod schema.
export async function generateObject<T>(
  params: GenerateObjectParams<T>
): Promise<{ object: T }> {
  const { schema, run, prompt } = params;
  if (!schema || typeof run !== "function") {
    throw new Error("ai-sdk-fake: schema and run() are required.");
  }
  const raw = await run({ schema, prompt });
  const parsed = schema.parse(raw);
  return { object: parsed };
}
