import z from "zod";

const SkiDataArguments = z
  .object({
    temperature: z.number().meta({
      description: "Ambient temperature outside (average)",
      choices: ["°C", "°F", "K"],
      default: "°C",
    }),
    wind: z.number().meta({
      description: "Average wind speed",
      unit: "km/h",
      // choices optional if you only accept km/h
    }),
    visibility: z.enum(["poor", "fair", "good", "excellent"]).meta({
      description: "Visibility on a defined scale",
      // constraints belong in the schema (enum), not metadata
    }),
  })
  .meta({ name: "SkiDataArguments" });

console.log(JSON.stringify(z.toJSONSchema(SkiDataArguments), null, 2));
