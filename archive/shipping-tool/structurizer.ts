// src/structurizer/structurizePackage.ts
// Structurizer "generateObject" calls: one without schema (bad), one with Zod schema (good).
// Mirrors AI SDK structured output usage, but uses our fake AI adapter.

import ai from "./ai.fake";
import { PackageInputSchema, PackageInput } from "./package.schema";

export async function structurizePackageNoSchema(prompt: string): Promise<any> {
  const { object } = await ai.generateObject({ prompt });
  return object;
}

export async function structurizePackageWithSchema(
  prompt: string
): Promise<PackageInput> {
  const { object } = await ai.generateObject<unknown>({
    prompt,
    schema: PackageInputSchema,
    schemaName: "PackageInput",
  });

  // Validate the AI-shaped object to ensure safety
  const parsed = PackageInputSchema.parse(object);
  return parsed;
}
