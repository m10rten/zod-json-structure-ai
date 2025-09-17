import {
  type SkiConditionsData,
  type SchemaGenerationOptions,
  generateSchemaForConfiguration,
  validateDataWithSchema,
  simulateAIDecision_WithoutMetadata,
  simulateAIDecision_WithMetadata,
  getConfigurationDescription,
  getSchemaPreview,
} from "./module";

// ============================================================================
// DEMO CONFIGURATION - Change these flags to test different approaches
// ============================================================================

const USE_ZOD = false; // Toggle Zod validation on/off
const USE_METADATA = false; // Toggle JSON Structure metadata on/off

// ============================================================================
// SAMPLE DATA - Realistic skiing conditions
// ============================================================================

const sampleSkiConditions: SkiConditionsData = {
  temperature: -5, // -5°C - perfect for skiing
  snowDepth: 45, // 45cm - excellent powder
  windSpeed: 12, // 12 km/h - light winds
  visibility: "excellent",
  location: {
    resort: "Alpine Peaks Resort",
    elevation: 2400, // 2400m - optimal altitude
  },
};

// ============================================================================
// MAIN DEMO FUNCTION
// ============================================================================

function runComprehensiveDemo() {
  console.clear();
  printDemoHeader();

  const options: SchemaGenerationOptions = {
    useZod: USE_ZOD,
    useMetadata: USE_METADATA,
  };

  // Generate schema based on current configuration
  const schemaResult = generateSchemaForConfiguration(options);
  const validation = validateDataWithSchema(sampleSkiConditions, schemaResult);

  // Display configuration and data
  displayConfiguration(options);
  displaySampleData();
  displaySchemaInformation(schemaResult);
  displayValidationResults(validation, schemaResult.hasValidation);

  // Show AI decision-making comparison
  demonstrateAIDecisionMaking(schemaResult, sampleSkiConditions);

  // Highlight the critical safety implications
  highlightSafetyImplications(options.useMetadata);

  printDemoFooter();
}

// ============================================================================
// DISPLAY FUNCTIONS - Clean, readable output formatting
// ============================================================================

function printDemoHeader() {
  console.log("🎿 SKIING CONDITIONS ANALYSIS DEMO");
  console.log("=".repeat(60));
  console.log(
    "Demonstrating the critical importance of explicit metadata in AI systems\n"
  );
}

function displayConfiguration(options: SchemaGenerationOptions) {
  console.log("⚙️  CURRENT CONFIGURATION:");
  console.log(`   USE_ZOD: ${options.useZod}`);
  console.log(`   USE_METADATA: ${options.useMetadata}`);
  console.log(`   Approach: ${getConfigurationDescription(options)}\n`);
}

function displaySampleData() {
  console.log("📊 SAMPLE SKIING CONDITIONS:");
  console.log(JSON.stringify(sampleSkiConditions, null, 2));
  console.log();
}

function displaySchemaInformation(
  schemaResult: ReturnType<typeof generateSchemaForConfiguration>
) {
  console.log("📋 GENERATED SCHEMA PREVIEW:");
  const preview = getSchemaPreview(
    schemaResult.schema,
    schemaResult.hasMetadata
  );
  console.log(JSON.stringify(preview, null, 2));

  console.log(`\n📝 Schema Features:`);
  console.log(
    `   ✅ Type Validation: ${
      schemaResult.hasValidation ? "Enabled" : "Disabled"
    }`
  );
  console.log(
    `   ✅ Metadata Context: ${
      schemaResult.hasMetadata ? "Enabled" : "Disabled"
    }`
  );
  console.log();
}

function displayValidationResults(validation: any, hasValidation: boolean) {
  if (hasValidation) {
    console.log("🔍 VALIDATION RESULTS:");
    console.log(`   Status: ${validation.success ? "✅ PASSED" : "❌ FAILED"}`);
    if (!validation.success && validation.error) {
      console.log("   Errors:", validation.error.errors);
    }
    console.log();
  }
}

function demonstrateAIDecisionMaking(
  schemaResult: ReturnType<typeof generateSchemaForConfiguration>,
  data: SkiConditionsData
) {
  console.log("🤖 AI DECISION-MAKING SIMULATION:");
  console.log("-".repeat(40));

  if (schemaResult.hasMetadata) {
    console.log(simulateAIDecision_WithMetadata(data, schemaResult.schema));
  } else {
    console.log(simulateAIDecision_WithoutMetadata(data));
  }
  console.log();
}

function highlightSafetyImplications(hasMetadata: boolean) {
  console.log("🚨 SAFETY IMPLICATIONS:");
  console.log("-".repeat(40));

  if (!hasMetadata) {
    console.log("❌ DANGEROUS: Without metadata, AI systems cannot determine:");
    console.log("   • Temperature units (°C vs °F vs K)");
    console.log("   • Distance units (cm vs inches vs feet)");
    console.log("   • Speed units (km/h vs mph vs m/s)");
    console.log("   • Measurement precision and accuracy");
    console.log("");
    console.log("   Example: -5°F = -20.6°C (dangerous hypothermia risk!)");
    console.log("   Example: -5°C = 23°F (perfect skiing temperature!)");
  } else {
    console.log("✅ SAFE: With metadata, AI systems understand:");
    console.log("   • Exact units for all measurements");
    console.log("   • Precision and scale requirements");
    console.log("   • Semantic context and safety ranges");
    console.log("   • Validation rules and constraints");
    console.log("");
    console.log("   Result: Accurate, safe decision-making possible!");
  }
  console.log();
}

function printDemoFooter() {
  console.log("=".repeat(60));
  console.log(
    "💡 Change USE_ZOD and USE_METADATA flags at the top to test different configurations"
  );
  console.log(
    "🔗 Full implementation: https://github.com/m10rten/zod-json-structure-ai/"
  );
}

// ============================================================================
// CONFIGURATION COMPARISON TOOL
// ============================================================================

function compareAllConfigurations() {
  console.clear();
  console.log("🔄 COMPARING ALL CONFIGURATION OPTIONS");
  console.log("=".repeat(60));

  const configurations: Array<{
    options: SchemaGenerationOptions;
    name: string;
  }> = [
    { options: { useZod: false, useMetadata: false }, name: "Plain Objects" },
    { options: { useZod: true, useMetadata: false }, name: "Zod Only" },
    { options: { useZod: false, useMetadata: true }, name: "Metadata Only" },
    { options: { useZod: true, useMetadata: true }, name: "Complete Solution" },
  ];

  configurations.forEach((config, index) => {
    console.log(`\n${index + 1}. ${config.name.toUpperCase()}`);
    console.log("-".repeat(30));

    const schemaResult = generateSchemaForConfiguration(config.options);
    const validation = validateDataWithSchema(
      sampleSkiConditions,
      schemaResult
    );

    console.log(`Validation: ${schemaResult.hasValidation ? "✅" : "❌"}`);
    console.log(`Metadata: ${schemaResult.hasMetadata ? "✅" : "❌"}`);
    console.log(`Safety Level: ${getSafetyLevel(config.options)}`);
  });

  console.log("\n" + "=".repeat(60));
  console.log(
    "Recommendation: Use Configuration 4 (Complete Solution) for production AI systems"
  );
}

function getSafetyLevel(options: SchemaGenerationOptions): string {
  if (!options.useZod && !options.useMetadata) return "🔴 DANGEROUS";
  if (options.useZod && !options.useMetadata) return "🟡 RISKY";
  if (!options.useZod && options.useMetadata) return "🟡 INCOMPLETE";
  return "🟢 SAFE";
}

// ============================================================================
// DEMO EXECUTION
// ============================================================================

// Run the main demo
runComprehensiveDemo();

// Uncomment to compare all configurations:
// compareAllConfigurations();
