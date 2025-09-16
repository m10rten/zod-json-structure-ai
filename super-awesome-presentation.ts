// presentation.typeview.ts
import * as z from "zod";
import { TypeView } from "./typeview";
import {
  generateSchemaForConfiguration,
  SkiConditionsData,
  getConfigurationDescription,
  getSchemaPreview,
  simulateAIDecision_WithoutMetadata_Ski,
  aiAnswer_Ski_NoMetadata,
  simulateAIDecision_WithMetadata_Ski,
  aiAnswer_Ski_WithMetadata,
  PrescriptionData,
  simulateAIDecision_WithoutMetadata_Medicine,
  aiAnswer_Med_NoMetadata,
  validateDataWithSchema,
  simulateAIDecision_WithMetadata_Medicine,
  aiAnswer_Med_WithMetadata,
  safeAddToRegistry,
  extractZodMetaPreview,
} from "./module";

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
  const tv = new TypeView({
    // Intentionally not setting global header/footer/title to avoid changing contents now
    showControls: true,
    title: "Metadata with AI",
    showSlideIndicator: true,
    keyboardNavigation: true,
    clearOnRender: true,
    exitOnLastSlide: false,
    footer: "Lightning Talks @ Plauti",
  });

  tv.addSlide({
    title: "Introduction",
    render: () => `
Using Zod Metadata, Registries, and JSON Schema to guide AI I/O

----

Contents:
- Why property metadata (units/context) prevents ambiguity
- JSON Schema basics + example
- How Zod connects authoring → prompting → validation
- Demo: bad → good (Ski, Medicine)
      `,
  });

  tv.addSlide({
    title: "Why metadata (what it can include)",
    render: () => `
Metadata fields per property:
- description, examples
- unit (°C, mg), unitChoices (mcg|mg|g), recommendedUnit
- frequencyUnitChoices (per_hour|per_day|per_week)
- amountUnitChoices (tablet|ml|pack|strip)
- id/title for linking and references

----

Purpose:
- Remove ambiguity, enable validation, guide AI to consistent outputs
      `,
  });

  tv.addSlide({
    title: "Importance of metadata",
    render: () => `
Explicit property intent:
- Temperature must include unit (C/F)
- Dose must include unit (mcg/mg/g)
- Frequency must include base (per_day)
- Amount must include packaging (tablet/ml)

----

Outcome:
- Safer automation, fewer errors, clearer contracts
      `,
  });

  tv.addSlide({
    title: "What is JSON Schema (short)",
    render: () => `
JSON Schema:
- A standard to describe JSON structure, constraints, and refs ($ref/$defs)
- Used to validate data and guide LLM structured output

----

We will show a tiny example next (1 property + a link)
      `,
  });

  // Simple Zod with 1 property "temperature" and a $ref link; show z.toJSONSchema output
  tv.addSlide({
    title: "JSON Schema Example (Simple Zod → JSON Schema with $ref + name)",
    render: () => {
      demoIdCounter += 1;
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

      return `
Minimal Zod with a link ($ref) and action name:

----

${codeSnippet}

----

Result (z.toJSONSchema):
${JSON.stringify(named, null, 2)}
      `;
    },
  });

  tv.addSlide({
    title: "How Zod comes in (author → registry → JSON Schema → AI/validation)",
    render: () => `
Flow:
- Author schemas in Zod; add .meta() per property
- Register schemas in a registry (ids for linking)
- Export JSON Schema via z.toJSONSchema(schema, { metadata: registry })
- Use JSON Schema to guide LLM output and validate I/O

----

Bonus: Codecs (wire ↔ internal)

Single source of truth, end-to-end
      `,
  });

  tv.addSlide({
    title: "Output Quality Ladder (Worst → Good)",
    render: () => `
AI outputs from worst to best:
- Worst: Nothing (free text)
- Bad: Validation only
- OK: Validation + JSON Schema
- Good: Metadata + Descriptions (+ Registries)
      `,
  });

  tv.addSlide({
    title: "Demo Outline (bad → good)",
    render: () => `
We will walk through:
- Slide 8: Ski — Plain (only json)
- Slide 9: Ski — Manual metadata (better)
- Slide 10: Medicine — Ambiguous (not so good)
- Slide 11: Medicine — Good with metadata (best)

----

Each slide shows: prompt → reasoning → concise AI answer
      `,
  });

  tv.addSlide({
    title: "Demo — Ski (Plain / bad)",
    render: () => {
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
      return `
${getConfigurationDescription(cfg)}

----

Action Preview (Ski):
${JSON.stringify(getSchemaPreview(cfg.schema, false, "ski"), null, 2)}

----

User: "Is it good weather to ski today?"
${simulateAIDecision_WithoutMetadata_Ski(skiData)}
${aiAnswer_Ski_NoMetadata(skiData)}
      `;
    },
  });

  tv.addSlide({
    title: "Demo — Ski (Manual metadata / better)",
    render: () => {
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
      return `
${getConfigurationDescription(cfg)}

----

Action Preview (Ski):
${JSON.stringify(getSchemaPreview(cfg.schema, true, "ski"), null, 2)}

----

User: "Is it good weather to ski today?"
${simulateAIDecision_WithMetadata_Ski(skiData, cfg.schema)}
${aiAnswer_Ski_WithMetadata(skiData, cfg.schema)}
      `;
    },
  });

  // Slide 10: Demo — Medicine (Ambiguous / bad) — updated
  tv.addSlide({
    title: "Demo — Medicine (Ambiguous / bad)",
    render: () => {
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

      return `
${getConfigurationDescription(cfgBare)}

----

Action Preview (Medicine):
${JSON.stringify(getSchemaPreview(cfgBare.schema, false, "medicine"), null, 2)}

----

User: "Please draft an antibiotic prescription for an adult with sinus infection."
${simulateAIDecision_WithoutMetadata_Medicine(ambiguousRx)}
${aiAnswer_Med_NoMetadata(ambiguousRx)}
    `;
    },
  });

  // Slide 11: Demo — Medicine (Good with metadata / best) — updated
  tv.addSlide({
    title: "Demo — Medicine (Good with metadata / best)",
    render: () => {
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

      return `
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
    `;
    },
  });

  tv.addSlide({
    title: "Takeaways:",
    render: () =>
      `
- Property metadata (units/context) → safety + clarity
- JSON Schema → structure-first prompting + validation
- Zod + registries → single source of truth

----

Bad → good progression improves reliability
      `.trim(),
  });

  tv.addSlide({
    title: "End of presentation",
    render: () => `
Thanks! Use ← to revisit slides or 'q' to quit.

----

Q&A
      `,
  });

  await tv.run();
}

if (require.main === module) {
  runPresentationFlow().catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  });
}
