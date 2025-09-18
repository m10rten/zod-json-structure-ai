import * as esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["./bad.ts"],
  bundle: true,
  minify: true,
  keepNames: false,
  outfile: ".build/bundle.js",
  platform: "node",
  target: "node22",
  format: "cjs",
});
