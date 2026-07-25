// File: scripts/build-mediapipe-bundle.mjs
// Description: Build script that bundles MediaPipe's tasks-vision module into
// a single IIFE global (MediapipeVision) via esbuild, written to
// public/mediapipe-vision-bundle.js for the face-tracking worker to import.

import { build } from "esbuild";

// Run the esbuild bundle step
build({
  // Entry point: the MediaPipe vision bundle from node_modules
  entryPoints: ["node_modules/@mediapipe/tasks-vision/vision_bundle.mjs"],
  // Bundle all dependencies into one file
  bundle: true,
  // Output as an IIFE (immediately-invoked function expression)
  format: "iife",
  // Expose the bundle as the global name "MediapipeVision"
  globalName: "MediapipeVision",
  // Destination file path
  outfile: "public/mediapipe-vision-bundle.js",
  // Exit the process with an error code on failure
}).catch(() => process.exit(1));