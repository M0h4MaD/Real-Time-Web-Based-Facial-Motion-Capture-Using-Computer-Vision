// src/Components/FaceTracker.jsx
import { useEffect, useRef } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { useFaceStore } from "../lib/globalStates";

export default function FaceTracker({ videoRef, isActive, isPaused }) {
  // ⚡ استدعاء الدالة فقط لمنع المكون من إعادة التصيير عند كل حركة وجه
  const setLandmarks = useFaceStore((state) => state.setLandmarks);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    if (!isActive) return;
    let landmarker;

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

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
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
        // ⚡ مزامنة عتادية (Hardware Sync) للحفاظ على سلاسة الإطارات
        animationFrameRef.current = requestAnimationFrame(predict);
        return;
      }

      const video = videoRef.current;
      if (video && video.readyState === 4) {
        const results = landmarker.detectForVideo(video, performance.now());
        if (results.faceLandmarks?.length > 0)
          setLandmarks(results.faceLandmarks[0]);
      }
      animationFrameRef.current = requestAnimationFrame(predict);
    }

    init();

    return () => {
      if (animationFrameRef.current)
        cancelAnimationFrame(animationFrameRef.current);
      if (videoRef.current?.srcObject)
        videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
    };
  }, [isActive, videoRef, setLandmarks, isPaused]);

  return null;
}
