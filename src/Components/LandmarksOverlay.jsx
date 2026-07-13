// src/Components/LandmarksOverlay.jsx
import { useEffect, useRef } from "react";
import { useFaceStore, useUIStore } from "../lib/globalStates";

// ⚡ نقل المصفوفات خارج المكون لكي تحجز في الذاكرة مرة واحدة فقط
const mouthIndices = [61, 291, 0, 17, 13, 14];
const eyesIndices = [159, 145, 33, 133, 386, 374, 263, 362];
const redIndices = [
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
];
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

export default function LandmarksOverlay() {
  const canvasRef = useRef(null);
  const { landmarks } = useFaceStore();
  const { landmarkMode } = useUIStore();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (
      !landmarkMode ||
      landmarkMode === "off" ||
      !landmarks ||
      landmarks.length === 0
    )
      return;

    let pointsToDraw = [];
    let connectionsToDraw = [];

    switch (landmarkMode) {
      case "all":
        pointsToDraw = landmarks.map((_, i) => i);
        connectionsToDraw = [...mouthConnections, ...eyesConnections];
        break;
      case "wireframe":
        connectionsToDraw = [
          ...mouthConnections,
          ...eyesConnections,
          ...faceContourConnections,
        ];
        break;
      case "points":
        pointsToDraw = landmarks.map((_, i) => i);
        break;
      case "mouth":
        pointsToDraw = mouthIndices;
        connectionsToDraw = mouthConnections;
        break;
      case "eyes":
        pointsToDraw = eyesIndices;
        connectionsToDraw = eyesConnections;
        break;
      case "cyberpunk":
        pointsToDraw = landmarks.map((_, i) => i);
        connectionsToDraw = faceContourConnections;
        break;
      default:
        break;
    }

    if (connectionsToDraw.length > 0) {
      ctx.beginPath();
      if (landmarkMode === "cyberpunk") {
        ctx.strokeStyle = "#00FFCC";
        ctx.lineWidth = 2;
        ctx.shadowBlur = 12;
        ctx.shadowColor = "#00FFCC";
      } else {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 0;
      }

      connectionsToDraw.forEach(([i1, i2]) => {
        if (!landmarks[i1] || !landmarks[i2]) return;
        ctx.moveTo(
          landmarks[i1].x * canvas.width,
          landmarks[i1].y * canvas.height,
        );
        ctx.lineTo(
          landmarks[i2].x * canvas.width,
          landmarks[i2].y * canvas.height,
        );
      });
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    if (pointsToDraw.length > 0) {
      pointsToDraw.forEach((index) => {
        const point = landmarks[index];
        if (!point) return;
        const isRed = redIndices.includes(index);

        ctx.beginPath();
        if (landmarkMode === "cyberpunk") {
          ctx.arc(
            point.x * canvas.width,
            point.y * canvas.height,
            0.8,
            0,
            2 * Math.PI,
          );
          ctx.fillStyle = "#00FFCC";
        } else {
          ctx.arc(
            point.x * canvas.width,
            point.y * canvas.height,
            isRed ? 3 : 1.2,
            0,
            2 * Math.PI,
          );
          ctx.fillStyle = isRed ? "#FF0000" : "#00FF00";
        }
        ctx.fill();

        if (isRed && landmarkMode !== "cyberpunk") {
          ctx.strokeStyle = "#FFFFFF";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });
    }
  }, [landmarks, landmarkMode]);

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
        visibility:
          landmarkMode && landmarkMode !== "off" ? "visible" : "hidden",
        pointerEvents: "none",
        zIndex: 1,
      }}
    />
  );
}
