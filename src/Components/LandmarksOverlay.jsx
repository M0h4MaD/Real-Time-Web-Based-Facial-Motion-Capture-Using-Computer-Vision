// File: src/Components/LandmarksOverlay.jsx
// Description: Draws the detected face landmarks and connections onto a 2D
// canvas overlaying the tracking video. Supports multiple display modes
// (points, wireframe, mouth/eyes only, cyberpunk) and dynamically resizes
// the canvas to match its container.

import React, { useEffect, useRef, useMemo, useState } from "react";
import { useFaceStore, useUIStore } from "../lib/globalStates";

// Indices for the mouth region landmarks
const mouthIndices = [61, 291, 0, 17, 13, 14];
// Indices for the eyes region landmarks
const eyesIndices = [159, 145, 33, 133, 386, 374, 263, 362];
// Set of indices highlighted in red (mouth + eyes + extra accent points)
const redIndices = new Set([4, 70, 52, 107, 300, 282, 336, 50, 280, ...mouthIndices, ...eyesIndices]);
// Connection pairs outlining the mouth
const mouthConnections = [[61, 0], [0, 291], [291, 17], [17, 61]];
// Connection pairs outlining the eyes
const eyesConnections = [
  [159, 33], [33, 145], [145, 133], [133, 159],
  [386, 263], [263, 374], [374, 362], [362, 386],
];
// Connection pairs tracing the outer face contour
const faceContourConnections = [
  [10, 338], [338, 297], [297, 332], [332, 284], [284, 251],
  [251, 389], [389, 356], [356, 454], [454, 323], [323, 361],
  [361, 288], [288, 397], [397, 365], [365, 379], [379, 378],
  [378, 400], [400, 377], [377, 152], [152, 148], [148, 176],
  [176, 149], [149, 150], [150, 136], [136, 172], [172, 58],
  [58, 132], [132, 93], [93, 234], [234, 127], [127, 162],
  [162, 21], [21, 54], [54, 103], [103, 67], [67, 109], [109, 10],
];

// Landmarks are now a flat Float32Array (478 x 3). Helpers read x/y without object overhead.
const lx = (landmarks, i) => landmarks[i * 3];
const ly = (landmarks, i) => landmarks[i * 3 + 1];
const hasPoint = (landmarks, i) => landmarks.length > i * 3 + 1;

// LandmarksOverlay component that renders face landmarks on a 2D canvas
const LandmarksOverlay = () => {
  // Ref to the outer container div
  const containerRef = useRef(null);
  // Ref to the canvas element
  const canvasRef = useRef(null);
  // Read the latest landmarks from the face store
  const landmarks = useFaceStore((state) => state.landmarks);
  // Read the current landmark display mode
  const landmarkMode = useUIStore((state) => state.landmarkMode);

  // Canvas size is dynamic via ResizeObserver instead of a fixed 320x240
  const [size, setSize] = useState({ width: 320, height: 240 });

  // Effect that observes container size changes to keep canvas in sync
  useEffect(() => {
    // Grab the container DOM node
    const container = containerRef.current;
    // Bail if it is not available
    if (!container) return;

    // Create a ResizeObserver to track the container size
    const observer = new ResizeObserver((entries) => {
      // Iterate over the observed entries
      for (const entry of entries) {
        // Current content box size
        const { width, height } = entry.contentRect;
        // Only update if the size is positive
        if (width > 0 && height > 0) {
          // Store the rounded size
          setSize({ width: Math.round(width), height: Math.round(height) });
        }
      }
    });

    // Start observing the container
    observer.observe(container);
    // Disconnect the observer on cleanup
    return () => observer.disconnect();
  }, []);

  // Memoized computation of which points and connections to draw
  const { pointsToDraw, connectionsToDraw } = useMemo(() => {
    // Accumulator for point indices
    let pts = [];
    // Accumulator for connection pairs
    let conns = [];
    // Nothing to draw if mode is unset or off
    if (!landmarkMode || landmarkMode === "off")
      return { pointsToDraw: pts, connectionsToDraw: conns };

    // All 478 landmark indices
    const allIndices = Array.from({ length: 478 }, (_, i) => i);

    // Decide what to draw based on the mode
    switch (landmarkMode) {
      // All points + mouth/eyes wireframe
      case "all":
        pts = allIndices;
        conns = [...mouthConnections, ...eyesConnections];
        break;
      // Wireframe only (mouth + eyes + face contour)
      case "wireframe":
        conns = [...mouthConnections, ...eyesConnections, ...faceContourConnections];
        break;
      // All points only
      case "points":
        pts = allIndices;
        break;
      // Mouth points + connections
      case "mouth":
        pts = mouthIndices;
        conns = mouthConnections;
        break;
      // Eyes points + connections
      case "eyes":
        pts = eyesIndices;
        conns = eyesConnections;
        break;
      // All points + face contour (cyberpunk)
      case "cyberpunk":
        pts = allIndices;
        conns = faceContourConnections;
        break;
      // Default: draw nothing extra
      default:
        break;
    }
    // Return the computed lists
    return { pointsToDraw: pts, connectionsToDraw: conns };
  }, [landmarkMode]);

  // Effect that redraws the canvas whenever inputs change
  useEffect(() => {
    // Grab the canvas DOM node
    const canvas = canvasRef.current;
    // Bail if not available
    if (!canvas) return;
    // Get the 2D drawing context
    const ctx = canvas.getContext("2d");

    // Clear the entire canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Bail if there are no landmarks or nothing to draw
    if (!landmarks || landmarks.length === 0 || (pointsToDraw.length === 0 && connectionsToDraw.length === 0))
      return;

    // Draw connections (wireframe) if any
    if (connectionsToDraw.length > 0) {
      // Begin a new path for lines
      ctx.beginPath();
      // Style differently for the cyberpunk mode
      if (landmarkMode === "cyberpunk") {
        // Neon cyan stroke
        ctx.strokeStyle = "#00FFCC";
        // Thicker line
        ctx.lineWidth = 2;
        // Glow blur
        ctx.shadowBlur = 4;
        // Glow color
        ctx.shadowColor = "#00FFCC";
      } else {
        // Semi-transparent white stroke
        ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        // Thinner line
        ctx.lineWidth = 1.5;
        // No glow
        ctx.shadowBlur = 0;
      }

      // Draw each connection as a line between two points
      for (let i = 0; i < connectionsToDraw.length; i++) {
        // The two point indices of this connection
        const [i1, i2] = connectionsToDraw[i];
        // Only draw if both points exist
        if (hasPoint(landmarks, i1) && hasPoint(landmarks, i2)) {
          // Move to the first point (scaled to canvas size)
          ctx.moveTo(
            lx(landmarks, i1) * canvas.width,
            ly(landmarks, i1) * canvas.height,
          );
          // Draw a line to the second point
          ctx.lineTo(
            lx(landmarks, i2) * canvas.width,
            ly(landmarks, i2) * canvas.height,
          );
        }
      }
      // Stroke the accumulated path
      ctx.stroke();
      // Reset glow
      ctx.shadowBlur = 0;
    }

    // Draw points using batch rendering for performance
    if (pointsToDraw.length > 0) {
      // Begin a new path for the (non-red) points
      ctx.beginPath();
      // Iterate over all points to draw
      for (let i = 0; i < pointsToDraw.length; i++) {
        // The current point index
        const index = pointsToDraw[i];
        // Draw small rects for non-red points that exist
        if (!redIndices.has(index) && hasPoint(landmarks, index)) {
          // Draw a tiny square at the point location
          ctx.rect(
            lx(landmarks, index) * canvas.width,
            ly(landmarks, index) * canvas.height,
            1.5,
            1.5,
          );
        }
      }
      // Fill color depends on mode
      ctx.fillStyle = landmarkMode === "cyberpunk" ? "#00FFCC" : "#00FF00";
      // Fill all the batched point rects
      ctx.fill();

      // Draw the red-accent points separately (non-cyberpunk only)
      if (landmarkMode !== "cyberpunk") {
        // Begin a new path for red points
        ctx.beginPath();
        // Iterate over all points again
        for (let i = 0; i < pointsToDraw.length; i++) {
          // The current point index
          const index = pointsToDraw[i];
          // Draw slightly larger rects for red points that exist
          if (redIndices.has(index) && hasPoint(landmarks, index)) {
            // Draw a small square at the point location
            ctx.rect(
              lx(landmarks, index) * canvas.width,
              ly(landmarks, index) * canvas.height,
              2.5,
              2.5,
            );
          }
        }
        // Red fill color
        ctx.fillStyle = "#FF0000";
        // Fill all the batched red point rects
        ctx.fill();
      }
    }
    // Re-run when these inputs change
  }, [landmarks, pointsToDraw, connectionsToDraw, landmarkMode, size]);

  return (
    // Absolutely-positioned container filling its parent
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
      {/* The canvas that draws landmarks */}
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
          // Hide when landmarks are off
          visibility: landmarkMode && landmarkMode !== "off" ? "visible" : "hidden",
          pointerEvents: "none",
        }}
      />
    </div>
  );
};

// Memoize the overlay to avoid unnecessary re-renders
export default React.memo(LandmarksOverlay);