export type SkiRawConditions = {
  temperature: number;
  tempUnit: "°C" | "°F" | "K" | null;
  wind: number;
  windUnit: "km/h" | "mph" | null;
  visibility: "poor" | "fair" | "good" | "excellent" | string;
};

export async function fetchSkiConditions(
  overrides: Partial<SkiRawConditions>
): Promise<SkiRawConditions> {
  // Example runtime data
  return {
    temperature: overrides.temperature ?? 30,
    tempUnit: overrides.tempUnit ?? "°F",
    wind: overrides.wind ?? 20,
    windUnit: overrides.windUnit ?? "km/h",
    visibility: overrides.visibility ?? "good",
  };
}
