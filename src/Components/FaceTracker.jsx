// src/Components/FaceTracker.jsx
import { useEffect, useRef } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { useFaceStore, useUIStore } from "../lib/globalStates";

export default function FaceTracker({ videoRef, isActive, isPaused }) {
  const setLandmarks = useFaceStore((state) => state.setLandmarks);
  
  // ⚡ جلب إعدادات الدقة والسرعة من السلايدر
  const cameraResolution = useUIStore((state) => state.cameraResolution);
  const trackingFPS = useUIStore((state) => state.trackingFPS);
  
  const animationFrameRef = useRef(null);
  
  // ⚡ إنشاء Canvas وسيط في الذاكرة (لا يظهر للمستخدم) لقص وتصغير الصورة
  const inferenceCanvasRef = useRef(document.createElement("canvas"));

  useEffect(() => {
    if (!isActive) return;
    let landmarker;
    let lastRunTime = 0;
    let activeStream = null;

    // 1. استخراج الأبعاد من اختيارك في السلايدر
    const [resWidth, resHeight] = cameraResolution.split("x").map(Number);
    
    // 2. تطبيق الأبعاد الصارمة على الـ Canvas الوسيط
    const canvas = inferenceCanvasRef.current;
    canvas.width = resWidth;
    canvas.height = resHeight;
    
    // ⚡ استخدام willReadFrequently يخبر المتصفح بتحسين الذاكرة لقراءة البكسلات المستمرة
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    async function init() {
      try {
        const vision = await FilesetResolver.forVisionTasks("/wasm");
        landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `/face_landmarker.task`,
            delegate: "GPU", // كرت الشاشة يتولى المعالجة
          },
          runningMode: "VIDEO",
        });

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
      
      // حساب الفاصل الزمني بناءً على الإطارات المطلوبة
      const interval = 1000 / trackingFPS;

      if (now - lastRunTime >= interval) {
        if (video && video.readyState === 4) {
          // ⚡ الخطوة الفاصلة: رسم نسخة مصغرة من الفيديو على الـ Canvas
          ctx.drawImage(video, 0, 0, resWidth, resHeight);
          
          // ⚡ إرسال الـ Canvas الخفيف جداً للمعالجة بدلاً من الفيديو الأصلي
          const results = landmarker.detectForVideo(canvas, now);
          
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
      
      if (landmarker) landmarker.close();
    };
  }, [isActive, videoRef, setLandmarks, isPaused, cameraResolution, trackingFPS]);

  return null;
}