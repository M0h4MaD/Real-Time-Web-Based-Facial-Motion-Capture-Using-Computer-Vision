import { build } from "esbuild";

build({
  entryPoints: ["node_modules/@mediapipe/tasks-vision/vision_bundle.mjs"],
  bundle: true,
  format: "iife",
  globalName: "MediapipeVision",
  outfile: "public/mediapipe-vision-bundle.js",
}).catch(() => process.exit(1));