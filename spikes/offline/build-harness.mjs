import * as esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["harness/app.ts"],
  bundle: true,
  format: "esm",
  target: "es2022",
  outfile: "harness/app.js",
  sourcemap: true,
});

console.log("built harness/app.js");
