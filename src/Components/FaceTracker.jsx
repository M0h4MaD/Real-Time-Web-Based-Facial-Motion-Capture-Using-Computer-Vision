// File: src/Components/FaceTracker.jsx
// Description: Drives face tracking. Spawns the MediaPipe FaceLandmarker Web
// Worker once (while active), starts the camera at the configured resolution,
// and runs a requestAnimationFrame loop that sends downscaled video frames to
// the worker which returns flat landmark arrays via the face store.

import { useEffect, useRef } from "react";
import { useFaceStore, useUIStore } from "../lib/globalStates";

// FaceTracker component that manages camera capture and worker communication
export default function FaceTracker({ videoRef, isActive, isPaused }) {
  // Action to store new landmarks into the face store
  const setLandmarks = useFaceStore((state) => state.setLandmarks);
  // Read the configured camera resolution (e.g. "640x480")
  const cameraResolution = useUIStore((state) => state.cameraResolution);
  // Read the configured tracking FPS target
  const trackingFPS = useUIStore((state) => state.trackingFPS);

  // Ref holding the current requestAnimationFrame id
  const animationFrameRef = useRef(null);
  // Ref holding the worker instance
  const workerRef = useRef(null);
  // Ref flag indicating the worker finished initializing
  const workerReadyRef = useRef(false);
  // Ref flag indicating the worker is processing a frame
  const isWorkerBusyRef = useRef(false);
  // Ref holding the active media stream
  const streamRef = useRef(null);
  // Ref holding the timestamp of the last frame sent
  const lastRunTimeRef = useRef(0);

  // Mirror latest props into refs so the rAF loop can read them without re-initializing
  const isPausedRef = useRef(isPaused);
  const trackingFPSRef = useRef(trackingFPS);
  // Keep the paused ref in sync with the prop
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  // Keep the FPS ref in sync with the prop
  useEffect(() => { trackingFPSRef.current = trackingFPS; }, [trackingFPS]);

  // Effect 1: Load model + Worker once while tracking is active.
  // cameraResolution and trackingFPS are intentionally omitted as dependencies
  // because changing them should not re-load the heavy model.
  useEffect(() => {
    // Do nothing if tracking is not active
    if (!isActive) return;

    // Create the worker from the FaceLandmarker worker module URL
    const worker = new Worker(
      new URL("../lib/faceLandmarker.worker.js", import.meta.url),
    );
    // Store the worker instance in the ref
    workerRef.current = worker;
    // Mark the worker as not yet ready
    workerReadyRef.current = false;
    // Mark the worker as not busy
    isWorkerBusyRef.current = false;

    // Handle messages coming back from the worker
    worker.onmessage = (e) => {
      // Destructure the message type and payload
      const { type, payload } = e.data;
      // Worker finished loading the model
      if (type === "ready") {
        workerReadyRef.current = true;
      } else if (type === "landmarks") {
        // New landmarks received: store them and mark idle
        setLandmarks(payload);
        isWorkerBusyRef.current = false;
      } else if (type === "no-face" || type === "done") {
        // No face or processing done: mark idle
        isWorkerBusyRef.current = false;
      } else if (type === "error") {
        // Log any worker error and mark idle
        console.error("FaceLandmarker worker error:", payload);
        isWorkerBusyRef.current = false;
      }
    };

    // Handle unexpected worker crashes
    worker.onerror = (err) => {
      console.error("Worker crashed:", err.message);
      isWorkerBusyRef.current = false;
    };

    // Send the init message to load the wasm and model
    worker.postMessage({
      type: "init",
      payload: { wasmPath: "/wasm", modelPath: "/face_landmarker.task" },
    });

    // Cleanup when the effect re-runs or unmounts
    return () => {
      // Tell the worker to close
      worker.postMessage({ type: "close" });
      // Terminate the worker process
      worker.terminate();
      // Clear the worker ref
      workerRef.current = null;
      // Reset ready flag
      workerReadyRef.current = false;
      // Reset busy flag
      isWorkerBusyRef.current = false;
    };
  }, [isActive, setLandmarks]);

  // Effect 2: Camera and capture loop. This re-runs when resolution changes,
  // but does not touch the model/worker at all.
  useEffect(() => {
    // Do nothing if tracking is not active
    if (!isActive) return;

    // Local flag to cancel async work on cleanup
    let cancelled = false;
    // Split the resolution string into numeric width and height
    const [resWidth, resHeight] = cameraResolution.split("x").map(Number);
    // Reset the last-run timer
    lastRunTimeRef.current = 0;

    // The prediction loop driven by requestAnimationFrame
    function predict() {
      // Stop if cancelled or tracking became inactive
      if (cancelled || !isActive) return;

      // Skip work if paused, worker not ready, or worker busy
      if (isPausedRef.current || !workerReadyRef.current || isWorkerBusyRef.current) {
        // Schedule the next frame and return
        animationFrameRef.current = requestAnimationFrame(predict);
        return;
      }

      // Current timestamp
      const now = performance.now();
      // The video element being captured
      const video = videoRef.current;
      // Minimum interval between frames based on target FPS
      const interval = 1000 / trackingFPSRef.current;

      // Only send a frame if enough time has elapsed
      if (now - lastRunTimeRef.current >= interval) {
        // Ensure the video is ready (HAVE_ENOUGH_DATA)
        if (video && video.readyState === 4) {
          // Mark the worker as busy
          isWorkerBusyRef.current = true;
          // Update the last-run timestamp
          lastRunTimeRef.current = now;

          // Create a downscaled bitmap from the video frame
          createImageBitmap(video, {
            // Target resize width
            resizeWidth: resWidth,
            // Target resize height
            resizeHeight: resHeight,
            // Use low-quality resize for speed
            resizeQuality: "low",
          })
            // Bitmap created successfully
            .then((bitmap) => {
              // Skip if cancelled or worker is gone, then free the bitmap
              if (cancelled || !workerRef.current) {
                bitmap.close();
                isWorkerBusyRef.current = false;
                return;
              }
              // Send the bitmap to the worker (transfer ownership, no copy)
              workerRef.current.postMessage(
                { type: "frame", payload: { bitmap, timestamp: now } },
                [bitmap],
              );
            })
            // Handle bitmap creation failure
            .catch((err) => {
              console.error("createImageBitmap error:", err);
              isWorkerBusyRef.current = false;
            });
        }
      }

      // Schedule the next animation frame
      animationFrameRef.current = requestAnimationFrame(predict);
    }

    // Async function to start the user's camera
    async function startCamera() {
      try {
        // Request camera access at the configured resolution
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: resWidth, height: resHeight },
        });

        // If cancelled while waiting, stop the tracks and bail
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        // Store the stream in the ref
        streamRef.current = stream;

        // Attach the stream to the video element if present
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Once metadata is loaded, play and start predicting
          videoRef.current.onloadedmetadata = async () => {
            await videoRef.current.play();
            predict();
          };
        }
      } catch (err) {
        // Log camera initialization errors
        console.error("Camera Init Error:", err);
      }
    }

    // Kick off the camera
    startCamera();

    // Cleanup on re-run/unmount
    return () => {
      // Signal async work to stop
      cancelled = true;
      // Cancel any pending animation frame
      if (animationFrameRef.current)
        cancelAnimationFrame(animationFrameRef.current);
      // Stop all camera tracks and release the stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [isActive, videoRef, cameraResolution]);

  // This component renders nothing itself
  return null;
}