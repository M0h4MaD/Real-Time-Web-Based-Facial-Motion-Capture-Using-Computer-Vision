// File: src/lib/faceLandmarker.worker.js
// Description: Web Worker that runs MediaPipe's FaceLandmarker off the main
// thread. It loads the wasm/model, detects face landmarks from incoming video
// frames, and posts back a flat Float32Array of landmarks (transferred
// zero-copy) to the main thread.

importScripts("/mediapipe-vision-bundle.js");
const { FaceLandmarker, FilesetResolver } = self.MediapipeVision;

// Module-level reference to the created landmarker
let landmarker = null;

// Handle messages sent to the worker
self.onmessage = async (e) => {
  // Destructure the message type and payload
  const { type, payload } = e.data;

  try {
    // Dispatch based on the message type
    switch (type) {
      // Initialize the model
      case "init": {
        // Read the wasm and model paths from the payload
        const { wasmPath, modelPath } = payload;
        // Resolve an absolute wasm URL
        const absoluteWasmPath = new URL(wasmPath, self.location.origin).href;

        // Resolve the vision fileset from the wasm path
        const vision = await FilesetResolver.forVisionTasks(absoluteWasmPath);

        // Create the FaceLandmarker with GPU delegate and VIDEO mode
        landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            // Path to the model asset
            modelAssetPath: modelPath,
            // Use the GPU delegate for better performance
            delegate: "GPU",
          },
          // Run in video (streaming) mode
          runningMode: "VIDEO",
        });

        // Tell the main thread the worker is ready
        self.postMessage({ type: "ready" });
        break;
      }

      // Process an incoming video frame
      case "frame": {
        // Read the bitmap and timestamp from the payload
        const { bitmap, timestamp } = payload;
        // If the model is not ready, close the bitmap and report done
        if (!landmarker) {
          bitmap.close();
          self.postMessage({ type: "done" });
          return;
        }

        try {
          // Run detection directly on the bitmap
          const results = landmarker.detectForVideo(bitmap, timestamp);

          // If a face was detected
          if (results.faceLandmarks?.length > 0) {
            // Take the first face's landmarks
            const lm = results.faceLandmarks[0];

            // Convert 478 {x,y,z} objects into one flat Float32Array (478 x 3 = 1434 numbers).
            // This avoids structured-cloning 478 JS objects every frame; the buffer is transferred zero-copy.
            const flat = new Float32Array(lm.length * 3);
            for (let i = 0; i < lm.length; i++) {
              // The current point object
              const p = lm[i];
              // Write x
              flat[i * 3] = p.x;
              // Write y
              flat[i * 3 + 1] = p.y;
              // Write z
              flat[i * 3 + 2] = p.z;
            }

            // Post the flat landmarks, transferring the buffer (zero-copy)
            self.postMessage({ type: "landmarks", payload: flat }, [flat.buffer]);
          } else {
            // No face detected this frame
            self.postMessage({ type: "no-face" });
          }
        } finally {
          // Always close the bitmap to free memory
          bitmap.close();
        }
        break;
      }

      // Clean up the landmarker
      case "close": {
        // Close the landmarker if it exists
        landmarker?.close();
        // Drop the reference
        landmarker = null;
        break;
      }
    }
  } catch (err) {
    // Report the error to the main thread
    self.postMessage({ type: "error", payload: String(err?.message || err) });
    // If this was a frame, report done so the loop continues
    if (type === "frame") self.postMessage({ type: "done" });
  }
};