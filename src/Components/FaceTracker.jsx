import { useEffect, useRef } from "react";
import { useFaceStore, useUIStore } from "../lib/globalStates";

export default function FaceTracker({ videoRef, isActive, isPaused }) {
  const setLandmarks = useFaceStore((state) => state.setLandmarks);
  const cameraResolution = useUIStore((state) => state.cameraResolution);
  const trackingFPS = useUIStore((state) => state.trackingFPS);

  const animationFrameRef = useRef(null);
  const workerRef = useRef(null);
  const workerReadyRef = useRef(false);
  const isWorkerBusyRef = useRef(false);
  const streamRef = useRef(null);
  const lastRunTimeRef = useRef(0);

  // ⚡ بنخزن القيم المتغيرة بـ refs عشان نقدر نقراها جوا حلقة predict()
  // بدون ما نحتاج نعيد إنشاء الـ effect (وبالتالي الموديل/الكاميرا) كل مرة تتغير
  const isPausedRef = useRef(isPaused);
  const trackingFPSRef = useRef(trackingFPS);
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);
  useEffect(() => {
    trackingFPSRef.current = trackingFPS;
  }, [trackingFPS]);

  // ============================================================
  // Effect 1: تحميل الموديل + الـ Worker — مرة وحدة بس طول ما التتبع شغال
  // ⚡ ملاحظة مقصودة: ما حطينا cameraResolution ولا trackingFPS هون كـ dependency،
  // لأنه تغييرهم ما لازم يفرض إعادة تحميل الموديل (أثقل خطوة وسبب التأخير)
  // ============================================================
  useEffect(() => {
    if (!isActive) return;

    const worker = new Worker(
      new URL("../lib/faceLandmarker.worker.js", import.meta.url),
    );
    workerRef.current = worker;
    workerReadyRef.current = false;
    isWorkerBusyRef.current = false;

    worker.onmessage = (e) => {
      const { type, payload } = e.data;
      if (type === "ready") {
        workerReadyRef.current = true;
      } else if (type === "landmarks") {
        setLandmarks(payload);
        isWorkerBusyRef.current = false;
      } else if (type === "no-face" || type === "done") {
        isWorkerBusyRef.current = false;
      } else if (type === "error") {
        console.error("FaceLandmarker worker error:", payload);
        isWorkerBusyRef.current = false;
      }
    };

    worker.onerror = (err) => {
      console.error("Worker crashed:", err.message);
      isWorkerBusyRef.current = false;
    };

    worker.postMessage({
      type: "init",
      payload: {
        wasmPath: "/wasm",
        modelPath: "/face_landmarker.task",
      },
    });

    return () => {
      worker.postMessage({ type: "close" });
      worker.terminate();
      workerRef.current = null;
      workerReadyRef.current = false;
      isWorkerBusyRef.current = false;
    };
  }, [isActive, setLandmarks]);

  // ============================================================
  // Effect 2: الكاميرا وحلقة الالتقاط — هاد يلي بيعيد تشغيله تغيير الدقة
  // بسرعة، لأنه ما بيلمس الموديل/الـ Worker إطلاقاً
  // ============================================================
  useEffect(() => {
    if (!isActive) return;

    let cancelled = false;
    const [resWidth, resHeight] = cameraResolution.split("x").map(Number);
    lastRunTimeRef.current = 0;

    function predict() {
      if (cancelled || !isActive) return;

      if (
        isPausedRef.current ||
        !workerReadyRef.current ||
        isWorkerBusyRef.current
      ) {
        animationFrameRef.current = requestAnimationFrame(predict);
        return;
      }

      const now = performance.now();
      const video = videoRef.current;
      const interval = 1000 / trackingFPSRef.current;

      if (now - lastRunTimeRef.current >= interval) {
        if (video && video.readyState === 4) {
          isWorkerBusyRef.current = true;
          lastRunTimeRef.current = now;

          createImageBitmap(video, {
            resizeWidth: resWidth,
            resizeHeight: resHeight,
            resizeQuality: "low",
          })
            .then((bitmap) => {
              if (cancelled || !workerRef.current) {
                bitmap.close();
                isWorkerBusyRef.current = false;
                return;
              }
              workerRef.current.postMessage(
                { type: "frame", payload: { bitmap, timestamp: now } },
                [bitmap],
              );
            })
            .catch((err) => {
              console.error("createImageBitmap error:", err);
              isWorkerBusyRef.current = false;
            });
        }
      }

      animationFrameRef.current = requestAnimationFrame(predict);
    }

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: resWidth, height: resHeight },
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = async () => {
            await videoRef.current.play();
            predict();
          };
        }
      } catch (err) {
        console.error("Camera Init Error:", err);
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      if (animationFrameRef.current)
        cancelAnimationFrame(animationFrameRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
    // ⚡ trackingFPS و isPaused ما عادوا هون — بينقروا عبر الـ refs فوق
    // فقط isActive و cameraResolution (والـ videoRef) لازم يعيدوا تشغيل هاد الجزء
  }, [isActive, videoRef, cameraResolution]);

  return null;
}
