// src/workers/faceLandmarker.worker.js
importScripts("/mediapipe-vision-bundle.js");
const { FaceLandmarker, FilesetResolver } = self.MediapipeVision;

let landmarker = null;
let canvas = null;
let ctx = null;

self.onmessage = async (e) => {
  const { type, payload } = e.data;

  try {
    switch (type) {
      case "init": {
        const { wasmPath, modelPath, width, height } = payload;
        const absoluteWasmPath = new URL(wasmPath, self.location.origin).href;

        const vision = await FilesetResolver.forVisionTasks(absoluteWasmPath);

        landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: modelPath,
            delegate: "GPU",
          },
          runningMode: "VIDEO",
        });

        canvas = new OffscreenCanvas(width, height);
        ctx = canvas.getContext("2d", { willReadFrequently: true });

        self.postMessage({ type: "ready" });
        break;
      }

      case "resize": {
        const { width, height } = payload;
        if (canvas) {
          canvas.width = width;
          canvas.height = height;
        }
        break;
      }

      case "frame": {
        const { bitmap, width, height, timestamp } = payload;
        if (!landmarker || !ctx) {
          bitmap.close();
          return;
        }

        ctx.drawImage(bitmap, 0, 0, width, height);
        bitmap.close();

        const results = landmarker.detectForVideo(canvas, timestamp);
        if (results.faceLandmarks?.length > 0) {
          self.postMessage({ type: "landmarks", payload: results.faceLandmarks[0] });
        }
        break;
      }

      case "close": {
        landmarker?.close();
        landmarker = null;
        canvas = null;
        ctx = null;
        break;
      }
    }
  } catch (err) {
    self.postMessage({ type: "error", payload: String(err?.message || err) });
  }
};