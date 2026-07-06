// src/Components/LandmarksOverlay.jsx
import { useEffect, useRef } from "react";
import { useFaceStore, useUIStore } from "../lib/globalStates";

export default function LandmarksOverlay() {
  const canvasRef = useRef(null);
  const { landmarks } = useFaceStore();
  const { showLandmarks } = useUIStore();

useEffect(() => {
  const canvas = canvasRef.current;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!showLandmarks || !landmarks || landmarks.length === 0) return;

  // 1. تحديد النقاط الحمراء (الأساسية)
  const redIndices = [
    4, 61, 291, 0, 13, 14, 17, 159, 145, 33, 133, 386, 374, 263, 362, 70, 52, 107, 300, 282, 336, 50, 280
  ];

  // 2. تحديد مسارات الربط (الأسلاك - Wireframe)
  const connections = [
    // الفم
    [61, 0], [0, 291], [291, 17], [17, 61],
    // العين اليسرى
    [159, 33], [33, 145], [145, 133], [133, 159],
    // العين اليمنى
    [386, 263], [263, 374], [374, 362], [362, 386]
  ];

  // 3. رسم الخطوط أولاً (لتكون في الخلفية تحت النقاط)
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'; // لون أحمر شفاف للخطوط
  ctx.lineWidth = 2;
  connections.forEach(([i1, i2]) => {
    const p1 = landmarks[i1];
    const p2 = landmarks[i2];
    ctx.moveTo(p1.x * canvas.width, p1.y * canvas.height);
    ctx.lineTo(p2.x * canvas.width, p2.y * canvas.height);
  });
  ctx.stroke();

  // 4. رسم النقاط (النقاط فوق الخطوط)
  landmarks.forEach((point, index) => {
    const isRed = redIndices.includes(index);

    ctx.beginPath();
    ctx.arc(
      point.x * canvas.width, 
      point.y * canvas.height, 
      isRed ? 4 : 1.5, 
      0, 2 * Math.PI
    );
    
    ctx.fillStyle = isRed ? '#FF0000' : '#00FF00';
    ctx.fill();

    // إطار للنقاط الحمراء
    if (isRed) {
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  });
}, [landmarks, showLandmarks]);

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={240}
      className="landmarks-canvas"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        // الحل هنا: إخفاء الكانفاس برمجياً وترك الـ Video في الواجهة
        visibility: showLandmarks ? "visible" : "hidden",
        pointerEvents: "none",
        zIndex: 1, // اجعل الكانفاس أقل أو مساوي للـ video
      }}
    />
  );
}
