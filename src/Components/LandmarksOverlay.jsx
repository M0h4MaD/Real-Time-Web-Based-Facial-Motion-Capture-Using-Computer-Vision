// src/Components/LandmarksOverlay.jsx
import React, { useEffect, useRef, useMemo, useState } from "react";
import { useFaceStore, useUIStore } from "../lib/globalStates";

const mouthIndices = [61, 291, 0, 17, 13, 14];
const eyesIndices = [159, 145, 33, 133, 386, 374, 263, 362];
const redIndices = new Set([
  4,
  70,
  52,
  107,
  300,
  282,
  336,
  50,
  280,
  ...mouthIndices,
  ...eyesIndices,
]);
const mouthConnections = [
  [61, 0],
  [0, 291],
  [291, 17],
  [17, 61],
];
const eyesConnections = [
  [159, 33],
  [33, 145],
  [145, 133],
  [133, 159],
  [386, 263],
  [263, 374],
  [374, 362],
  [362, 386],
];
const faceContourConnections = [
  [10, 338],
  [338, 297],
  [297, 332],
  [332, 284],
  [284, 251],
  [251, 389],
  [389, 356],
  [356, 454],
  [454, 323],
  [323, 361],
  [361, 288],
  [288, 397],
  [397, 365],
  [365, 379],
  [379, 378],
  [378, 400],
  [400, 377],
  [377, 152],
  [152, 148],
  [148, 176],
  [176, 149],
  [149, 150],
  [150, 136],
  [136, 172],
  [172, 58],
  [58, 132],
  [132, 93],
  [93, 234],
  [234, 127],
  [127, 162],
  [162, 21],
  [21, 54],
  [54, 103],
  [103, 67],
  [67, 109],
  [109, 10],
];

// ⚡ اللاندماركس هلق Float32Array مسطّح: النقطة i موجودة عند landmarks[i*3] (x)
// و landmarks[i*3+1] (y). هلبر بسيط لقراءتها بدل landmarks[i].x القديمة
const lx = (landmarks, i) => landmarks[i * 3];
const ly = (landmarks, i) => landmarks[i * 3 + 1];
const hasPoint = (landmarks, i) => landmarks.length > i * 3 + 1;

const LandmarksOverlay = () => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const landmarks = useFaceStore((state) => state.landmarks);
  const landmarkMode = useUIStore((state) => state.landmarkMode);

  // ⚡ حجم الـ canvas صار ديناميكي (ResizeObserver) بدل ما يكون ثابت 320x240 —
  // هيك بيتماشى صح مع أي دقة كاميرا أو حجم نافذة تتبع (Rnd)
  const [size, setSize] = useState({ width: 320, height: 240 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setSize({ width: Math.round(width), height: Math.round(height) });
        }
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const { pointsToDraw, connectionsToDraw } = useMemo(() => {
    let pts = [];
    let conns = [];

    if (!landmarkMode || landmarkMode === "off")
      return { pointsToDraw: pts, connectionsToDraw: conns };

    const allIndices = Array.from({ length: 478 }, (_, i) => i);

    switch (landmarkMode) {
      case "all":
        pts = allIndices;
        conns = [...mouthConnections, ...eyesConnections];
        break;
      case "wireframe":
        conns = [
          ...mouthConnections,
          ...eyesConnections,
          ...faceContourConnections,
        ];
        break;
      case "points":
        pts = allIndices;
        break;
      case "mouth":
        pts = mouthIndices;
        conns = mouthConnections;
        break;
      case "eyes":
        pts = eyesIndices;
        conns = eyesConnections;
        break;
      case "cyberpunk":
        pts = allIndices;
        conns = faceContourConnections;
        break;
      default:
        break;
    }
    return { pointsToDraw: pts, connectionsToDraw: conns };
  }, [landmarkMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (
      !landmarks ||
      landmarks.length === 0 ||
      (pointsToDraw.length === 0 && connectionsToDraw.length === 0)
    )
      return;

    // 1. رسم الخطوط
    if (connectionsToDraw.length > 0) {
      ctx.beginPath();
      if (landmarkMode === "cyberpunk") {
        ctx.strokeStyle = "#00FFCC";
        ctx.lineWidth = 2;
        ctx.shadowBlur = 4;
        ctx.shadowColor = "#00FFCC";
      } else {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 0;
      }

      for (let i = 0; i < connectionsToDraw.length; i++) {
        const [i1, i2] = connectionsToDraw[i];
        if (hasPoint(landmarks, i1) && hasPoint(landmarks, i2)) {
          ctx.moveTo(
            lx(landmarks, i1) * canvas.width,
            ly(landmarks, i1) * canvas.height,
          );
          ctx.lineTo(
            lx(landmarks, i2) * canvas.width,
            ly(landmarks, i2) * canvas.height,
          );
        }
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // 2. رسم النقاط بنظام Batch Rendering فائق السرعة
    if (pointsToDraw.length > 0) {
      ctx.beginPath();
      for (let i = 0; i < pointsToDraw.length; i++) {
        const index = pointsToDraw[i];
        if (!redIndices.has(index) && hasPoint(landmarks, index)) {
          ctx.rect(
            lx(landmarks, index) * canvas.width,
            ly(landmarks, index) * canvas.height,
            1.5,
            1.5,
          );
        }
      }
      ctx.fillStyle = landmarkMode === "cyberpunk" ? "#00FFCC" : "#00FF00";
      ctx.fill();

      if (landmarkMode !== "cyberpunk") {
        ctx.beginPath();
        for (let i = 0; i < pointsToDraw.length; i++) {
          const index = pointsToDraw[i];
          if (redIndices.has(index) && hasPoint(landmarks, index)) {
            ctx.rect(
              lx(landmarks, index) * canvas.width,
              ly(landmarks, index) * canvas.height,
              2.5,
              2.5,
            );
          }
        }
        ctx.fillStyle = "#FF0000";
        ctx.fill();
      }
    }
  }, [landmarks, pointsToDraw, connectionsToDraw, landmarkMode, size]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 1,
      }}
    >
      <canvas
        ref={canvasRef}
        width={size.width}
        height={size.height}
        className="landmarks-canvas"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          visibility:
            landmarkMode && landmarkMode !== "off" ? "visible" : "hidden",
          pointerEvents: "none",
        }}
      />
    </div>
  );
};

export default React.memo(LandmarksOverlay);
