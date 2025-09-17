import z from "zod";

const ski = z.object({
  temperature: z.number(),
  wind: z.number(),
  visibility: z.string(),
});

console.log(JSON.stringify(z.toJSONSchema(ski), null, 2));
