import z from "zod";

const ski = z
  .object({
    temperature: z.number().meta({
      description: "Ambient Temperature Outside at average",
      units: ["°C", "°F", "K"],
      default: "°C",
    }),
    wind: z.number().meta({
      description: "Average wind speed",
      unit: "km/h",
    }),
    visibility: z.enum(["poor", "fair", "good", "excellent"]).meta({
      description: "Visibility on a defined scale",
    }),
  })
  .meta({
    name: "SkiDataArguments",
  });

console.log(JSON.stringify(z.toJSONSchema(ski), null, 2));
