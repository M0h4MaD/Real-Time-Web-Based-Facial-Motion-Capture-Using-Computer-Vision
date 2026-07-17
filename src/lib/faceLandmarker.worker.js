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

      // ⚡ ما عاد في حاجة لـ resize/canvas إطلاقاً — detectForVideo بياخد ImageBitmap مباشرة

      case "frame": {
        const { bitmap, timestamp } = payload;
        if (!landmarker) {
          bitmap.close();
          // ⚡ مهم: لازم نرجّع "done" حتى لو ما عالجنا شي، وإلا الـ main thread هيفضل واقف مستني رد ما بيجيش
          self.postMessage({ type: "done" });
          return;
        }

        try {
          // ⚡ التعديل الأهم: تمرير الـ bitmap مباشرة، بدون أي canvas أو drawImage وسيط
          const results = landmarker.detectForVideo(bitmap, timestamp);

          if (results.faceLandmarks?.length > 0) {
            self.postMessage({
              type: "landmarks",
              payload: results.faceLandmarks[0],
            });
          } else {
            // ⚡ لازم نبلغ حتى لو ما في وجه، عشان الـ main thread يعرف يبعت الفريم يلي بعده
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
    // ⚡ حتى بحالة الخطأ، لازم نحرر الـ main thread من انتظار busy=false
    if (type === "frame") self.postMessage({ type: "done" });
  }
};
