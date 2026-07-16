import { useEffect, useRef } from "react";
import { useFaceStore, useUIStore } from "../lib/globalStates";

export default function FaceTracker({ videoRef, isActive, isPaused }) {
  const setLandmarks = useFaceStore((state) => state.setLandmarks);
  const cameraResolution = useUIStore((state) => state.cameraResolution);
  const trackingFPS = useUIStore((state) => state.trackingFPS);

  const animationFrameRef = useRef(null);
  const workerRef = useRef(null);
  const workerReadyRef = useRef(false);

  useEffect(() => {
    if (!isActive) return;

    let cancelled = false;
    let lastRunTime = 0;
    let activeStream = null;

    const [resWidth, resHeight] = cameraResolution.split("x").map(Number);

    // ⚡ لازم type: "module" وإلا الـ import جوه الـ worker مش هيتحل، وده أصل الـ moduleFactory error
    const worker = new Worker(
      new URL("../lib/faceLandmarker.worker.js", import.meta.url),

    );
    workerRef.current = worker;
    workerReadyRef.current = false;

    worker.onmessage = (e) => {
      const { type, payload } = e.data;
      if (type === "ready") {
        workerReadyRef.current = true;
      } else if (type === "landmarks") {
        setLandmarks(payload);
      } else if (type === "error") {
        console.error("FaceLandmarker worker error:", payload);
      }
    };

    worker.onerror = (err) => {
      console.error("Worker crashed:", err.message);
    };

    worker.postMessage({
      type: "init",
      payload: {
        wasmPath: "/wasm",
        modelPath: "/face_landmarker.task",
        width: resWidth,
        height: resHeight,
      },
    });

    async function init() {
      try {
        activeStream = await navigator.mediaDevices.getUserMedia({
          video: { width: resWidth, height: resHeight },
        });

        if (videoRef.current) {
          videoRef.current.srcObject = activeStream;
          videoRef.current.onloadedmetadata = async () => {
            await videoRef.current.play();
            predict();
          };
        }
      } catch (err) {
        console.error("Init Error:", err);
      }
    }

    function predict() {
      if (cancelled || !isActive) return;

      if (isPaused || !workerReadyRef.current) {
        animationFrameRef.current = requestAnimationFrame(predict);
        return;
      }

      const now = performance.now();
      const video = videoRef.current;
      const interval = 1000 / trackingFPS;

      if (now - lastRunTime >= interval) {
        if (video && video.readyState === 4) {
          // ⚡ نلتقط فريم كـ ImageBitmap على الـ main thread فقط (video عنصر DOM مش قابل للنقل)
          createImageBitmap(video, {
            resizeWidth: resWidth,
            resizeHeight: resHeight,
          })
            .then((bitmap) => {
              workerRef.current?.postMessage(
                {
                  type: "frame",
                  payload: {
                    bitmap,
                    width: resWidth,
                    height: resHeight,
                    timestamp: now,
                  },
                },
                [bitmap] // ⚡ transfer، مش نسخ — رخيص جداً
              );
            })
            .catch((err) => console.error("createImageBitmap error:", err));
        }
        lastRunTime = now;
      }

      animationFrameRef.current = requestAnimationFrame(predict);
    }

    init();

    return () => {
      cancelled = true;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (activeStream) activeStream.getTracks().forEach((t) => t.stop());

      worker.postMessage({ type: "close" });
      worker.terminate();
      workerRef.current = null;
      workerReadyRef.current = false;
    };
  }, [isActive, videoRef, setLandmarks, isPaused, cameraResolution, trackingFPS]);

  return null;
}