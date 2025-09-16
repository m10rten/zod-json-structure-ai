import { TypeView } from "./typeview";

/**
 * 5-min flow (short slides, more of them): Problem → Solution (3) → Demo (dialogs + code) → Implementation (3) → Ladder → Close
 * - Start with Ski (30°F vs 30°C), no medicine example
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
Using Zod metadata and JSON Schema to guide AI I/O

Contents:
- Problem: ambiguity (Ski example)
- Solution: Schema + metadata + Zod
- Demo: dialogs + code (before/after, MCP data)
- Implementation: 3 quick steps + quality ladder
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
        content: `🖥️ MCP: temperature=30, wind=20, visibility="good"`,
      },
      {
        mode: "accumulate",
        content: `🤖 AI: 30 sounds warm; probably fine. 20 wind seems okay. "Good" visibility sounds nice.`,
      },
      {
        mode: "accumulate",
        content: `
Issue: units and scale are guessed → inconsistent answers.`,
      },
    ],
  });

  // 2: Why it matters — units flip meaning
  tv.addSlide({
    title: "Why it matters — units flip meaning",
    content: `
- 30°F ≈ -1°C → potentially OK
- 30°C → Summer → likely not great
- Wind: 20 km/h vs 20 mph → different conditions
- "good" must be on a defined scale
        `,
  });

  // 3: Solution — Make intent explicit
  tv.addSlide({
    title: "Solution — make intent explicit",
    content: `
Stop guessing by defining:
- Structure + constraints → JSON Schema
- Guidance → metadata (units, enum, default)
- Single source → Define in Zod → to JSON Schema → prompt + validate
        `,
  });

  // 4: JSON Schema — constraints
  tv.addSlide({
    title: "JSON Schema — constraints",
    content: `
Defines:
- properties
- types
- custom fields

Use it to constrain and validate I/O. Choices/default live in metadata.
        `,
  });

  // 5: Metadata — guidance
  tv.addSlide({
    title: "Metadata — guidance",
    content: `
Per property add (for example):
- unit: '°C', 'km/h'; for temperature units, or visibility scale choices
- enum: ['good','bad','fair'] for fixed values with different options
- default: '°C' (preferred unit)
- description, examples, context related fields
        `,
  });

  // 6: Zod → JSON Schema
  tv.addSlide({
    title: "Zod → JSON Schema",
    content: `
Define once in Zod with .meta() and .describe().

Generate JSON Schema via:

const schema = z.toJsonSchema(SkiDataArguments);
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
      description: 'Ambient Temperature Outside at average',
      units: ['°C', '°F', 'K'],
      default: '°C',
    }),
    wind: z.number().meta({
      description: 'Average wind speed',
      unit: 'km/h',
    }),
    visibility: z.enum(['poor', 'fair', 'good', 'excellent']).meta({
      description: 'Visibility on a defined scale',
    }),
  })
  .meta({
    name: 'SkiDataArguments',
  });
`,
      },
    ],
  });

  // 8: Demo — Generate JSON Schema + show (after)
  tv.addSlide({
    title: "Demo — Generate JSON Schema",
    content: `
const schema = z.toJsonSchema(SkiDataArguments);
console.log(JSON.stringify(schema, null, 2));

Result (short):
{
  "title": "SkiDataArguments",
  "type": "object",
  "properties": {
    "temperature": {
      "type": "number",
      "description": "Ambient Temperature Outside at average",
      "units": ["°C", "°F", "K"],
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
    title: "Bonus — After demo: structured output (AI SDK)",
    stages: [
      {
        mode: "replace",
        content: `
Before (text output):
- AI answers in prose; no enforced structure → harder to consume programmatically.
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
    "MCP: temperature=30 °F, wind=20 km/h, visibility=good.",
});

// Example result:
console.log(object);
// → {
//   decision: "yes",
//   reason: "About -1 °C, 20 km/h, visibility good — acceptable.",
//   data: { temperatureC: -1, windKmh: 20, visibility: "good" }
// }
`,
      },
    ],
  });

  // 10: Dialog — after (MCP data → structured answer)
  tv.addSlide({
    title: "Dialog — after (MCP data → structured answer)",
    content: `With metadata, the AI fetches runtime data, normalizes to default units, and returns a SkiDecision object.`,
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
        content: `🖥️ MCP: temperature=30 °F, wind=20 km/h, visibility="good"`,
      },
      {
        mode: "accumulate",
        content: `🤖 AI (SkiDecision): {
  "decision": "yes",
  "reason": "About -1 °C, 20 km/h, visibility good — acceptable.",
  "data": { "temperatureC": -1, "windKmh": 20, "visibility": "good" }
}`,
      },
    ],
  });

  // 11: Output Quality Ladder
  tv.addSlide({
    title: "Output quality ladder",
    content: `
Worst → Good (& Best):
- Free text
- Validation only
- JSON Schema (shape)
- JSON Schema + metadata (unit, choices incl. 'K', default, examples)
- (With structured output & validation on ai)
        `,
  });

  // 12: Implementation — Steps 1–3 using accumulate
  tv.addSlide({
    title: "Implementation — Steps 1–3",
    content: "Three quick steps to production:",
    stages: [
      {
        mode: "accumulate",
        content: `
- Step 1 (Define in Zod)
  - Use Zod .describe()/.meta() per property
  - Add unit/enum/default to remove ambiguity
  - Provide 1–2 examples for tricky fields`,
      },
      {
        mode: "accumulate",
        content: `
- Step 2 (Generate + prompt)
  - Generate with z.toJsonSchema(SkiDataArguments)
  - Provide schema + descriptions in tool/system prompt
  - AI fetches runtime data from MCP (🖥️) and uses metadata to interpret/normalize`,
      },
      {
        mode: "accumulate",
        content: `
- Step 3 (Validate)
  - Use zod to validate structured output (see \`ai\` sdk)
  - Reject or auto-correct invalid payloads
`,
      },
    ],
  });

  // 13: Conclusion
  tv.addSlide({
    title: "Conclusion",
    content: `
- Property metadata (units/context) → safety + clarity
- JSON Schema → structure-first prompting + validation
- Zod + I/O → single source of truth & automated & sanitised I/O
        `,
  });

  // 14: End + Q&A
  tv.addSlide({
    title: "End + Q&A",
    content: `
Thanks! Use ← → to navigate, 'q' to quit.

Short, consistent metadata → better AI I/O.
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
