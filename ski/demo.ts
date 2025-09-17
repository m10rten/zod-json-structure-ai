import { parseArgs } from "node:util";
import { runPresentationFlow } from "./slides";
import type { BaseProfile } from "./ski.schema";
import { SkiRawConditions } from "./mcp.fake";

const { values } = parseArgs({
  options: {
    usa: { type: "boolean", default: false },
    temperature: { type: "string" },
    wind: { type: "string" },
    visibility: { type: "string" },
  },
});

const profile: BaseProfile = values.usa ? "usa" : "intl";

const overrides: Partial<SkiRawConditions> = {};
if (values.temperature !== undefined) {
  const num = Number(values.temperature);
  if (!Number.isNaN(num)) overrides.temperature = num;
}
if (values.wind !== undefined) {
  const num = Number(values.wind);
  if (!Number.isNaN(num)) overrides.wind = num;
}
if (typeof values.visibility === "string") {
  overrides.visibility = values.visibility;
}

runPresentationFlow(profile, overrides).catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
