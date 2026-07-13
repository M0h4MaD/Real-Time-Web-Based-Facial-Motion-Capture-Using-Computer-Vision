import { useEffect } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { useFaceStore } from "../lib/globalStates";

// 🔥 أضفنا isPaused هنا
export default function FaceTracker({ videoRef, isActive, isPaused }) {
  const { setLandmarks } = useFaceStore((state) => state);

  useEffect(() => {
    if (!isActive) return;
    let landmarker; let animationFrameId;

    async function init() {
      try {
        const vision = await FilesetResolver.forVisionTasks("/wasm");
        landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: `/face_landmarker.task`, delegate: "GPU" },
          runningMode: "VIDEO",
        });

        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = async () => {
            await videoRef.current.play();
            predict();
          };
        }
      } catch (err) { console.error("Init Error:", err); }
    }

    function predict() {
      if (!isActive) return;
      
      // 🔥 التخطي إذا كانت النافذة تتحرك لإنقاذ الأداء
      if (isPaused) {
        animationFrameId = setTimeout(predict, 60);
        return;
      }

      const video = videoRef.current;
      if (video && video.readyState === 4) {
        const results = landmarker.detectForVideo(video, performance.now());
        if (results.faceLandmarks?.length > 0) setLandmarks(results.faceLandmarks[0]);
      }
      animationFrameId = setTimeout(predict, 60);
    }
    init();

    return () => {
      clearTimeout(animationFrameId);
      if (videoRef.current?.srcObject) videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
    };
  }, [isActive, videoRef, setLandmarks, isPaused]); // أضفنا isPaused للمصفوفة
  return null;
}