// src/Components/FaceTracker.jsx
import { useEffect, useRef } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { useFaceStore, useUIStore } from "../lib/globalStates";

export default function FaceTracker({ videoRef, isActive, isPaused }) {
  const setLandmarks = useFaceStore((state) => state.setLandmarks);
  const cameraResolution = useUIStore((state) => state.cameraResolution);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    if (!isActive) return;
    let landmarker;
    let lastRunTime = 0;
    let activeStream = null;

    async function init() {
      try {
        const vision = await FilesetResolver.forVisionTasks("/wasm");
        landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `/face_landmarker.task`,
            delegate: "GPU",
          },
          runningMode: "VIDEO",
        });

        // استخراج الطول والعرض من النص القادم من الإعدادات
        const [resWidth, resHeight] = cameraResolution.split("x").map(Number);

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
      if (!isActive) return;

      if (isPaused) {
        animationFrameRef.current = requestAnimationFrame(predict);
        return;
      }

      const now = performance.now();
      const video = videoRef.current;

      // إزالة حد الـ 30FPS القديم الخاص بـ isLowEndMode للسماح للكاميرا بالعمل بأقصى فريمات حسب دقتها
      if (now - lastRunTime >= 0) {
        if (video && video.readyState === 4) {
          const results = landmarker.detectForVideo(video, now);
          if (results.faceLandmarks?.length > 0) {
            setLandmarks(results.faceLandmarks[0]);
          }
        }
        lastRunTime = now;
      }

      animationFrameRef.current = requestAnimationFrame(predict);
    }

    init();

    return () => {
      if (animationFrameRef.current)
        cancelAnimationFrame(animationFrameRef.current);
      if (activeStream) activeStream.getTracks().forEach((t) => t.stop());

      // السطر الحاسم لمنع تسرب ذاكرة VRAM وانهيار المتصفح
      if (landmarker) landmarker.close();
    };
  }, [isActive, videoRef, setLandmarks, isPaused, cameraResolution]);

  return null;
}
