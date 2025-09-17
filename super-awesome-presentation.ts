import { TypeView } from "./typeview";

/**
 * 5-min flow (short slides, more of them): Problem → Solution (3) → Demo (dialogs + code) → Implementation (3) → Ladder → Close
 * - Start with Ski (25°F vs 25°C), no medicine example
 * - Data is unknown before the question; after the question the AI fetches runtime data from MCP (🖥️)
 * - No ask-back; the AI displays MCP data with units and normalizes if needed
 * - Use metadata keys: unit, choices, default (no unitChoices/enum/recommendedUnit)
 * - Include code examples: Zod (before/after), JSON Schema (after), and z.toJsonSchema usage
 * - Include user–AI dialogs with emoji
 */
export async function runPresentationFlow(): Promise<void> {
  const tv = new TypeView({
    showControls: false,
    title: "Metadata with AI",
    showSlideIndicator: true,
    showStageIndicator: true,
    keyboardNavigation: true,
    clearOnRender: true,
    exitOnLastSlide: false,
    footer: "Lightning Talks @ Plauti — Arrows ← →, press q to quit",
  });

  // 0: Intro
  tv.addSlide({
    title: "Introduction",
    content: `
Make AI answers predictable and easy to trust with Schema, Metadata, and Zod.

You will see:
- Problem: ambiguous data (Ski example)
- Why: what happens and why is this a problem
- Solution: JSON Schema + metadata + Zod for validation
- Demo: short dialog + code (before/after, MCP data)
- Implementation: 3 steps towards a stable & context-aware AI.

Based on: WeAreDevelopers 📍 Berlin
        `,
  });

  // 1: Problem — Ski ambiguity (merged with "Dialog — before" using accumulate stages)
  tv.addSlide({
    title: "Problem — Ambiguity",
    stages: [
      {
        content: `👤 User: Is it good to ski today?`,
      },
      {
        mode: "accumulate",
        content: `🤖 AI: Fetching ski conditions from MCP…`,
      },
      {
        mode: "accumulate",
        content: `🖥️ MCP: temperature=25, wind=20, visibility="good"`,
      },
      {
        mode: "accumulate",
        content: `🤖 AI: 25 is quite warm (assuming Celsius); probably fine. 20 wind seems okay. "Good" visibility sounds nice.`,
      },
      {
        mode: "accumulate",
        content: `
Issue: numbers/labels without units or defined scales → the AI guesses → inconsistent answers.`,
      },
    ],
  });

  // 2: Why it matters — units flip meaning
  tv.addSlide({
    title: "Why it matters — units flip meaning",
    content: `
- 25°F ≈ -4°C → chilly but skiable
- 25°C → summer → no snow or very slushy
- 30K ≈ -243°C → impossible

- Wind: 20 km/h vs 20 mph → different conditions

- "good" visibility only makes sense on a known scale
        `,
  });

  // 3: Solution — Make intent explicit
  tv.addSlide({
    title: "Solution — make intent explicit",
    content: `
Stop guessing. Define and enforce:
- Structure + constraints → JSON Schema (shared shape)
- Guidance → metadata on each field (unit, choices, default)
- Validation → Zod at runtime (input & output)

        `,
    stages: [
      {
        mode: "accumulate",
        content: "Flow Example:",
      },
      {
        mode: "accumulate",
        content: `- user → (text) AI/tool → (json schema) MCP → (structured data) AI → (normalized answer)`,
      },
    ],
  });

  // 4: JSON Schema — constraints
  tv.addSlide({
    title: "JSON Schema — constraints",
    content: `
Defines:
- properties, types, required, enum, minimum/maximum, etc.
- A standard format to prompt models and to keep I/O consistent

Use it to constrain and give context to AI/MCP.
Add metadata (unit, choices, default) to guide interpretation and normalization.
        `,
  });

  // 5: Metadata — guidance
  tv.addSlide({
    title: "Metadata — guidance",
    content: `
Per property add (examples):
- unit: '°C', 'km/h'
- choices: ['°C', '°F', 'K'] for allowed units/scales
- default: '°C' (preferred normalized unit)
- description, examples, context

The model uses metadata to interpret MCP data and normalize outputs.
        `,
  });

  // 6: Schema-first, Zod as a tool
  tv.addSlide({
    title: "Schema-first, Zod as a tool",
    content: `
JSON Schema at the center:
- Define in Zod for TS ergonomics; export JSON Schema for prompting and AI context.
- Validate at runtime with Zod in your app.
- JSON Schema is the contract; Zod is the DX-friendly tool.

Example generation path:
const json = z.toJsonSchema(SkiDataArguments);
        `,
  });

  // 7: Demo — Zod (before → after) using replace
  tv.addSlide({
    title: "Demo — Zod (before → after)",
    stages: [
      {
        mode: "replace",
        content: `
const SkiDataArguments = z.object({
  temperature: z.number(),     // unit?
  wind: z.number(),            // unit?
  visibility: z.string(),      // scale?
});
`,
      },
      {
        mode: "replace",
        content: `
const SkiDataArguments = z
  .object({
    temperature: z.number().meta({
      description: 'Ambient temperature outside (average)',
      choices: ['°C', '°F', 'K'],
      default: '°C',
    }),
    wind: z.number().meta({
      description: 'Average wind speed',
      unit: 'km/h',
      // choices optional if you only accept km/h
    }),
    visibility: z.enum(['poor', 'fair', 'good', 'excellent']).meta({
      description: 'Visibility on a defined scale',
      // constraints belong in the schema (enum), not metadata
    }),
  })
  .meta({ name: 'SkiDataArguments' });
`,
      },
    ],
  });

  // 8: Demo — Generate JSON Schema + show (after)
  tv.addSlide({
    title: "Demo — Generate JSON Schema",
    content: `
const json = z.toJsonSchema(SkiDataArguments);
console.log(JSON.stringify(json, null, 2));

Result (short):
{
  "name": "SkiDataArguments",
  "type": "object",
  "properties": {
    "temperature": {
      "type": "number",
      "description": "Ambient temperature outside (average)",
      "unit": "°C",
      "choices": ["°C", "°F", "K"],
      "default": "°C"
    },
    "wind": {
      "type": "number",
      "description": "Average wind speed",
      "unit": "km/h"
    },
    "visibility": {
      "type": "string",
      "description": "Visibility on a defined scale",
      "enum": ["poor", "fair", "good", "excellent"]
    }
  },
  "required": ["temperature", "wind", "visibility"],
  "additionalProperties": false
}
        `,
  });

  // 9: Bonus — After demo: structured output (AI SDK)
  tv.addSlide({
    title: "Bonus — After demo: structured output (AI SDK + Zod)",
    stages: [
      {
        mode: "replace",
        content: `
Before (free-form text):
- AI answers in prose; hard to consume and easy to misinterpret.
`,
      },
      {
        mode: "replace",
        content: `
// After (structured object via AI SDK — validated by Zod)
import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';

// Output schema for the AI's final answer (normalized units + decision)
const SkiDecision = z.object({
  decision: z.enum(['yes', 'no', 'maybe']).describe('Is it good to ski?'),
  reason: z.string().describe('Short explanation.'),
  data: z.object({
    temperatureC: z.number().describe('Normalized °C'),
    windKmh: z.number().describe('Normalized km/h'),
    visibility: z.enum(['poor', 'fair', 'good', 'excellent']),
  }),
});

// Use the model with structured outputs to force a JSON object result
const { object } = await generateObject({
  model: openai('gpt-4.1-mini', { structuredOutputs: true }),
  schema: SkiDecision,
  prompt:
    "Normalize MCP data to default units (°C, km/h) and decide if it's good to ski. " +
    "MCP: temperature=25 °F, wind=20 km/h, visibility=good.",
});

// Example result:
console.log(object);
// → {
//   decision: "yes",
//   reason: "About -4 °C, 20 km/h, visibility good — acceptable.",
//   data: { temperatureC: -4, windKmh: 20, visibility: "good" }
// }
`,
      },
    ],
  });

  // 10: Dialog — after (MCP data → structured answer)
  tv.addSlide({
    title: "Dialog — after (MCP data → structured answer)",
    content: `With JSON Schema + metadata, the AI fetches runtime data, normalizes to default units, validates shape, and returns a SkiDecision object.`,
    stages: [
      {
        mode: "append",
        content: `👤 User: Is it good to ski today?`,
      },
      {
        mode: "accumulate",
        content: `🤖 AI: Fetching ski conditions from MCP…`,
      },
      {
        mode: "accumulate",
        content: `🖥️ MCP: temperature=25 °F, wind=20 km/h, visibility="good"`,
      },
      {
        mode: "accumulate",
        content: `🤖 AI (SkiDecision): {
  "decision": "yes",
  "reason": "About -4 °C, 20 km/h, visibility good — acceptable.",
  "data": { "temperatureC": -4, "windKmh": 20, "visibility": "good" }
}`,
      },
    ],
  });

  // 11: Implementation — Steps 1–3 using accumulate
  tv.addSlide({
    title: "Implementation — Steps 1-3",
    content: "Three quick steps to production:",
    stages: [
      {
        mode: "accumulate",
        content: `
- Step 1 (Define schema)
  - Author in Zod; generate JSON Schema (single source you can share)
  - Add per-property metadata: unit, choices, default; include description/examples`,
      },
      {
        mode: "accumulate",
        content: `
- Step 2 (Prompt with schema)
  - Provide the JSON Schema (and metadata) in the tool/system prompt
  - AI fetches runtime data from MCP (🖥️), shows units, and normalizes to defaults
  - Ask the model for structured output matching your schema`,
      },
      {
        mode: "accumulate",
        content: `
- Step 3 (Validate + normalize)
  - Validate outputs with Zod
  - Normalize units to defaults (e.g., °C, km/h)
  - Reject or auto-correct invalid payloads`,
      },
    ],
  });

  // 12: Conclusion
  tv.addSlide({
    title: "Conclusion",
    content: `
- Property metadata (unit/choices/default) → clarity, stability, safer I/O
- JSON Schema → structure-first prompting + cross-tool consistency
- Zod → great developer ergonomics; generate schema; validate at runtime
        `,
  });

  // 14: End + Q&A
  tv.addSlide({
    title: "End + Q&A",
    content: `
Thanks! Use ← → to navigate, 'q' to quit.

Short, consistent metadata + Zod validation → better, more stable AI I/O.
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
