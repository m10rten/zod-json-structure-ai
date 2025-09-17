/* src/demo.ts */
import {
  calcShippingToolBad,
  calcShippingTool,
} from "./calculateshipping.tool";
import { packageInputJsonSchema, quoteJsonSchema } from "./package.schema";
import {
  structurizePackageNoSchema,
  structurizePackageWithSchema,
} from "./structurizer";
import { TypeView, Slide } from "../typeview";

async function main() {
  // Same use case for both scenarios. Intentional inches/pounds to highlight unit handling.
  const prompt =
    "Please ship a 20x15x10 inch package weighing 5 lb to DE with express service.";

  // Compute results first
  const badStruct = await structurizePackageNoSchema(prompt);
  const badQuote = await calcShippingToolBad(badStruct);

  const goodStruct = await structurizePackageWithSchema(prompt);
  const goodQuote = await calcShippingTool(goodStruct);

  // Simple difference illustration (naive): cost diff
  const badCost = badQuote?.cost ?? NaN;
  const goodCost = goodQuote.cost;
  const delta =
    Number.isFinite(badCost) && goodCost > 0
      ? Math.round((Math.abs(badCost - goodCost) / goodCost) * 100)
      : "N/A";

  // Build the TypeView presentation
  const tv = new TypeView({
    title: "Shipping Quote Demo",
    header: "Structurizer + Zod v4 + JSON Schema",
    footer: "Press ←/→ or Space to navigate, q to quit",
    clearOnRender: true,
    showControls: true,
    showSlideIndicator: true,
    showStageIndicator: true,
    keyboardNavigation: true,
    exitOnLastSlide: false,
    nonInteractiveStages: "all",
  });

  const fmt = (v: unknown) => JSON.stringify(v, null, 2);

  tv.addSlide({
    title: "Overview",
    content: [
      "This demo contrasts two flows:",
      "- Bad: structurizer without schema -> tool without validation",
      "- Good: structurizer with Zod schema -> validated tool",
      "",
      "Follow the steps to see how schema validation prevents unit confusion.",
    ],
  })
    .addSlide({
      title: "User Prompt",
      content: fmt(prompt),
    })
    .addSlide({
      title: "Bad flow",
      content: [
        "Structurizer (no schema) -> Bad Tool",
        "Base content is always shown; step through to see outputs.",
      ],
      stages: [
        {
          mode: "accumulate",
          render: () =>
            ["Unvalidated structurizer output:", fmt(badStruct)].join("\n"),
        },
        {
          mode: "accumulate",
          render: () =>
            [
              "Bad tool quote (likely incorrect due to unit confusion):",
              fmt(badQuote),
            ].join("\n"),
        },
      ],
    })
    .addSlide({
      title: "Good flow",
      content: [
        "Structurizer (with Zod schema) -> Good Tool",
        "Step through to see validated struct and quote.",
      ],
      stages: [
        {
          mode: "accumulate",
          render: () =>
            ["Validated structurizer output:", fmt(goodStruct)].join("\n"),
        },
        {
          mode: "accumulate",
          render: () =>
            [
              "Good tool quote (correct unit handling and validation):",
              fmt(goodQuote),
            ].join("\n"),
        },
      ],
    })
    .addSlide({
      title: "Cost comparison",
      content: [
        `bad=${String(badCost)} vs good=${String(goodCost)} (delta ~${String(
          delta
        )}%)`,
      ],
    })
    .addSlide({
      title: "JSON Schemas (from Zod v4)",
      content: "Two schemas generated from Zod.",
      stages: [
        {
          mode: "append",
          render: () =>
            ["PackageInput JSON Schema:", fmt(packageInputJsonSchema)].join(
              "\n"
            ),
        },
        {
          mode: "append",
          render: () =>
            ["ShippingQuote JSON Schema:", fmt(quoteJsonSchema)].join("\n"),
        },
      ],
    });

  await tv.run();
}

main().catch((err) => {
  console.error("Demo failed:", err);
  process.exit(1);
});
