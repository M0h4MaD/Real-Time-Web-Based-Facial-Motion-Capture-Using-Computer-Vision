// src/workers/faceLandmarker.worker.js
importScripts("/mediapipe-vision-bundle.js");
const { FaceLandmarker, FilesetResolver } = self.MediapipeVision;

let landmarker = null;

self.onmessage = async (e) => {
  const { type, payload } = e.data;

  try {
    switch (type) {
      case "init": {
        const { wasmPath, modelPath } = payload;
        const absoluteWasmPath = new URL(wasmPath, self.location.origin).href;

        const vision = await FilesetResolver.forVisionTasks(absoluteWasmPath);

        landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: modelPath,
            delegate: "GPU",
          },
          runningMode: "VIDEO",
        });

        self.postMessage({ type: "ready" });
        break;
      }

      case "frame": {
        const { bitmap, timestamp } = payload;
        if (!landmarker) {
          bitmap.close();
          self.postMessage({ type: "done" });
          return;
        }

        try {
          // ⚡ لسا عم نمرر الـ bitmap مباشرة لـ detectForVideo (بدون canvas وسيط)
          const results = landmarker.detectForVideo(bitmap, timestamp);

          if (results.faceLandmarks?.length > 0) {
            const lm = results.faceLandmarks[0];

            // ⚡ الجديد: تحويل الـ 478 كائن {x,y,z} لـ Float32Array مسطّح واحد
            // (478 × 3 = 1434 رقم). هيك بدل ما نعمل structured clone لـ 478
            // كائن JS كل فريم، عم ننقل buffer واحد بدون نسخ (transfer صفر تكلفة)
            const flat = new Float32Array(lm.length * 3);
            for (let i = 0; i < lm.length; i++) {
              const p = lm[i];
              flat[i * 3] = p.x;
              flat[i * 3 + 1] = p.y;
              flat[i * 3 + 2] = p.z;
            }

            self.postMessage({ type: "landmarks", payload: flat }, [
              flat.buffer,
            ]);
          } else {
            self.postMessage({ type: "no-face" });
          }
        } finally {
          bitmap.close();
        }
        break;
      }

      case "close": {
        landmarker?.close();
        landmarker = null;
        break;
      }
    }
  } catch (err) {
    self.postMessage({ type: "error", payload: String(err?.message || err) });
    if (type === "frame") self.postMessage({ type: "done" });
  }
};
