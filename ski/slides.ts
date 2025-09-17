import { TypeView } from "../typeview";
import { fetchSkiConditions, SkiRawConditions } from "./mcp.fake";
import { generateObject } from "./ai.fake";
import {
  buildSkiSchemas,
  getObjectShape,
  getSchemaMeta,
  BaseProfile,
} from "./ski.schema";
import z from "zod";

function f2(n: number): string {
  return Number.isFinite(n) ? n.toFixed(2) : String(n);
}

function convertToC(
  temperature: number,
  unit: "°C" | "°F" | "K" | null
): number {
  if (unit === "°F") return (temperature - 32) * (5 / 9);
  if (unit === "K") return temperature - 273.15;
  return temperature;
}

function convertToF(
  temperature: number,
  unit: "°C" | "°F" | "K" | null
): number {
  if (unit === "°C" || unit === null) return (temperature * 9) / 5 + 32;
  if (unit === "K") return ((temperature - 273.15) * 9) / 5 + 32;
  return temperature;
}

function toKmh(wind: number, unit: "km/h" | "mph" | null): number {
  return unit === "mph" ? wind * 1.609344 : wind;
}
function toMph(wind: number, unit: "km/h" | "mph" | null): number {
  return unit === "km/h" || unit === null ? wind / 1.609344 : wind;
}

function normalizeToProfile(raw: SkiRawConditions, profile: BaseProfile) {
  const visibilityKnown = ["poor", "fair", "good", "excellent"] as const;
  const visibility = visibilityKnown.includes(raw.visibility as any)
    ? (raw.visibility as (typeof visibilityKnown)[number])
    : "fair";

  if (profile === "usa") {
    const temperatureF = convertToF(raw.temperature, raw.tempUnit);
    const windMph = toMph(raw.wind, raw.windUnit);
    return { temperatureF, windMph, visibility };
  }
  const temperatureC = convertToC(raw.temperature, raw.tempUnit);
  const windKmh = toKmh(raw.wind, raw.windUnit);
  return { temperatureC, windKmh, visibility };
}

function naiveCelsiusOpinion(value: number): string {
  // Map common cases you mentioned; works for ranges too
  if (value >= 40) return "sounds extremely hot"; // e.g., 45
  if (value >= 15) return "sounds warm"; // e.g., 20
  if (value >= 0) return "sounds good"; // e.g., 5
  return "sounds cold";
}

function decideSkiUsingCAndKmh(
  temperatureC: number,
  windKmh: number,
  visibility: "poor" | "fair" | "good" | "excellent"
) {
  if (visibility === "poor")
    return { decision: "no" as const, reason: "Visibility is poor." };
  if (temperatureC < -20)
    return { decision: "no" as const, reason: "Too cold." };
  if (temperatureC > 10)
    return { decision: "no" as const, reason: "Too warm." };
  if (windKmh > 50) return { decision: "maybe" as const, reason: "High wind." };
  if (temperatureC < -10 && windKmh > 30)
    return { decision: "maybe" as const, reason: "Cold and windy." };
  return { decision: "yes" as const, reason: "Conditions look acceptable." };
}

export async function runPresentationFlow(
  profile: BaseProfile = "intl",
  overrides?: Partial<SkiRawConditions>
): Promise<void> {
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

  // Build schemas with profile-specific metadata defaults
  const { SkiDataArguments, SkiDecision, decisionKeys } =
    buildSkiSchemas(profile);

  // MCP data, optionally overridden via CLI flags
  const mcp = await fetchSkiConditions(overrides ?? {});

  // Produce a naive remark assuming "°C" when MCP actually reports "°F"
  const naiveTempRemark =
    mcp.tempUnit === "°F"
      ? `${mcp.temperature} ${naiveCelsiusOpinion(
          mcp.temperature
        )} (assuming °C)`
      : null;

  const normalized = normalizeToProfile(mcp, profile);

  // Evaluate in °C / km/h to keep the heuristic consistent
  const evalTempC =
    profile === "usa"
      ? ((normalized as any).temperatureF - 32) * (5 / 9)
      : (normalized as any).temperatureC;
  const evalWindKmh =
    profile === "usa"
      ? (normalized as any).windMph * 1.609344
      : (normalized as any).windKmh;

  const decision = decideSkiUsingCAndKmh(
    evalTempC,
    evalWindKmh,
    (normalized as any).visibility
  );

  const ai = await generateObject({
    schema: SkiDecision,
    prompt: `Normalize MCP data to default units (${decisionKeys.tempUnitLabel}, ${decisionKeys.windUnitLabel}) and decide if it is good to ski.`,
    run: () => {
      const data: Record<string, unknown> = {
        visibility: (normalized as any).visibility,
      };
      data[decisionKeys.tempKey] = Number(
        (normalized as any)[decisionKeys.tempKey].toFixed(2)
      );
      data[decisionKeys.windKey] = Number(
        (normalized as any)[decisionKeys.windKey].toFixed(2)
      );
      return {
        decision: decision.decision,
        reason: decision.reason,
        data,
      };
    },
  });

  const jsonSchema = z.toJSONSchema(SkiDataArguments);

  // Extract metadata (live)
  const metaLines: string[] = [];
  const shape = getObjectShape(SkiDataArguments as any) || {};
  for (const key of Object.keys(shape)) {
    const meta = (getSchemaMeta(shape[key] as any) || {}) as Record<
      string,
      unknown
    >;

    metaLines.push(
      `- ${key}: ${JSON.stringify(shape[key], null, 0) || "(no meta)"}`
    );
  }

  const dialogBefore = [
    "👤 User: Is it good to ski today?",
    "🤖 AI: Fetching ski conditions from MCP…",
    `🖥️ MCP: temperature=${mcp.temperature}, wind=${mcp.wind}`,
    `    visibility="${mcp.visibility}"`,
    "🤖 AI (without schema): Sounds fine? Units unclear → risk of wrong conclusion.",
  ].join("\n");

  const dialogAfter = [
    "👤 User: Is it good to ski today?",
    "🤖 AI: Fetching ski conditions from MCP…",
    `🖥️ MCP: temperature=${mcp.temperature} ${
      mcp.tempUnit ?? "(unknown)"
    }, wind=${mcp.wind} ${mcp.windUnit ?? "(unknown)"} `,
    `    visibility="${mcp.visibility}"`,
    `🤖 AI: Normalized to defaults (${decisionKeys.tempUnitLabel}, ${decisionKeys.windUnitLabel}).`,
    `🤖 AI (SkiDecision): ${JSON.stringify(ai.object, null, 2)}`,
  ].join("\n");

  // Slides — same flow, live data (no static code blocks)
  tv.addSlide({
    title: "Introduction",
    content: [
      "Using Zod metadata and JSON Schema to guide AI I/O",
      "",
      "Contents:",
      "- Problem: ambiguity (Ski example)",
      "- Solution: Schema + metadata + Zod",
      "- Demo: dialogs + runtime code (MCP data, normalization)",
      "- Implementation: 3 quick steps + quality ladder",
    ].join("\n"),
  });

  tv.addSlide({
    title: "Problem — Ambiguity",
    stages: [
      { content: "👤 User: Is it good to ski today?" },
      {
        mode: "accumulate",
        content: "🤖 AI: Fetching ski conditions from MCP…",
      },
      {
        mode: "accumulate",
        content: `🖥️ MCP: temperature=${mcp.temperature} ${
          mcp.tempUnit ?? "(unknown)"
        }, wind=${mcp.wind} ${mcp.windUnit ?? "(unknown)"}, visibility="${
          mcp.visibility
        }"`,
      },
      {
        mode: "accumulate",
        content: naiveTempRemark
          ? `🤖 AI: ${naiveTempRemark}. Wind unit and "good" scale remain unclear.\nIssue: implicit assumptions → inconsistent answers.`
          : "🤖 AI: Units and scales are unspecified → inconsistent answers.",
      },
    ],
  });

  tv.addSlide({
    title: "Why it matters — units flip meaning (example)",
    content: [
      "- 30°F ≈ -1°C → potentially OK",
      "- 30°C → Summer → likely not great",
      "- Wind: 20 km/h vs 20 mph → different conditions",
      '- "good" must be on a defined scale',
    ].join("\n"),
  });

  tv.addSlide({
    title: "Solution — make intent explicit",
    content: [
      "Stop guessing by defining:",
      "- Structure + constraints → JSON Schema",
      "- Guidance → metadata (unit, choices, default)",
      "- Single source → Define in Zod → to JSON Schema → prompt + validate",
    ].join("\n"),
  });

  tv.addSlide({
    title: "Metadata (live from schema)",
    content: ["Per property:", ...metaLines].join("\n"),
  });

  tv.addSlide({
    title: "JSON Schema (generated)",
    stages: [
      {
        mode: "append",
        render: () => JSON.stringify(jsonSchema, null, 2),
      },
    ],
  });

  tv.addSlide({
    title: "Dialog — before vs after",
    stages: [
      { mode: "replace", content: dialogBefore },
      { mode: "replace", content: dialogAfter },
    ],
  });

  tv.addSlide({
    title: "Normalization (computed)",
    content: [
      `Input:      ${mcp.temperature} ${mcp.tempUnit ?? "(unknown)"} | ${
        mcp.wind
      } ${mcp.windUnit ?? "(unknown)"} | ${(normalized as any).visibility}`,
      `Normalized: ${f2((normalized as any)[decisionKeys.tempKey])} ${
        decisionKeys.tempUnitLabel
      } | ${f2((normalized as any)[decisionKeys.windKey])} ${
        decisionKeys.windUnitLabel
      } | ${(normalized as any).visibility}`,
    ].join("\n"),
  });

  tv.addSlide({
    title: "Structured answer (validated)",
    content: JSON.stringify(ai.object, null, 2),
  });

  tv.addSlide({
    title: "Output quality ladder",
    content: [
      "Worst → Good (& Best):",
      "- Free text",
      "- Validation only",
      "- JSON Schema (shape)",
      "- JSON Schema + metadata (unit, choices, default, examples)",
      "- (With structured output & validation on AI result)",
    ].join("\n"),
  });

  tv.addSlide({
    title: "Implementation — Steps 1–3",
    content: "Three quick steps to production:",
    stages: [
      {
        mode: "accumulate",
        content: [
          "- Step 1 (Define in Zod)",
          "  - Use Zod .describe()/.meta() per property",
          "  - Add unit/choices/default to remove ambiguity",
          "  - Provide 1–2 examples for tricky fields",
        ].join("\n"),
      },
      {
        mode: "accumulate",
        content: [
          "- Step 2 (Generate + prompt)",
          "  - Generate JSON Schema from Zod (with metadata for guidance)",
          "  - Provide schema + descriptions in tool/system prompt",
          "  - AI fetches runtime data from MCP (🖥️) and uses metadata to interpret/normalize",
        ].join("\n"),
      },
      {
        mode: "accumulate",
        content: [
          "- Step 3 (Validate)",
          "  - Validate structured outputs with Zod",
          "  - Reject or auto-correct invalid payloads",
        ].join("\n"),
      },
    ],
  });

  tv.addSlide({
    title: "Conclusion",
    content: [
      "- Property metadata (units/context) → safety + clarity",
      "- JSON Schema → structure-first prompting + validation",
      "- Zod + I/O → single source of truth & sanitized I/O",
    ].join("\n"),
  });

  tv.addSlide({
    title: "End + Q&A",
    content: [
      "Thanks! Use ← → to navigate, q to quit.",
      "",
      "Short, consistent metadata → better AI I/O.",
    ].join("\n"),
  });

  await tv.run();
}
