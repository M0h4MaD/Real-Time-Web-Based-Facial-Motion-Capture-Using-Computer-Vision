import { useEffect } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

export default function FaceTracker({ videoRef, onResults }) {
  useEffect(() => {
    let landmarker;
    let animationFrameId;

    async function init() {
      try {
        console.log("DEBUG: Initializing MediaPipe...");

        // 1. تحميل أدوات MediaPipe من المسار المحلي /wasm
        const vision = await FilesetResolver.forVisionTasks("/wasm");

        // 2. إعداد المودل
        landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `/face_landmarker.task`,
            delegate: "GPU",
          },
          runningMode: "VIDEO",
        });

        // 3. طلب الكاميرا
        console.log("DEBUG: Requesting camera access...");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
        });

        // 4. الربط والتأكد من جهوزية الكاميرا
        if (videoRef.current) {
          videoRef.current.srcObject = stream;

          // انتظار تحميل الميتا داتا لضمان أن الفيديو جاهز للتشغيل
          videoRef.current.onloadedmetadata = async () => {
            try {
              await videoRef.current.play();
              console.log("DEBUG: Video playing. Starting prediction loop...");
              predict();
            } catch (err) {
              console.error("DEBUG: Play failed:", err);
            }
          };
        }
      } catch (err) {
        console.error("DEBUG: Error in FaceTracker init:", err);
      }
    }

    // دالة التوقع (Loop)
    function predict() {
      const video = videoRef.current;

      // التأكد أن الفيديو لا يزال موجوداً وجاهزاً
      if (video && video.readyState === 4) {
        const results = landmarker.detectForVideo(video, performance.now());

        if (results.faceLandmarks?.length > 0) {
          // إرسال أول وجه تم اكتشافه للمكون الأب
          onResults(results.faceLandmarks[0]);
        }
      }

      // جدولة الإطار التالي (حوالي 15 إطاراً في الثانية كافية جداً للتتبع)
      animationFrameId = setTimeout(predict, 60);
    }

    // بدء العملية
    init();

    // التنظيف عند إغلاق الكومبوننت لمنع تسريب الذاكرة
    return () => {
      console.log("DEBUG: Cleaning up FaceTracker...");
      clearTimeout(animationFrameId);
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      }
    };
  }, [videoRef, onResults]);

  // لا يحتاج واجهة، هو معالج خلفي فقط
  return null;
}