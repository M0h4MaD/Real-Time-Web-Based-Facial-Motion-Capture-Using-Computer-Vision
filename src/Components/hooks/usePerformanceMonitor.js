// File: src/Components/hooks/usePerformanceMonitor.js
// Description: React hook that samples the browser's frame rate (FPS) and JS
// heap memory (if available) once per second using requestAnimationFrame and
// returns them as state.

import { useState, useEffect } from "react";

// Custom hook returning live fps and memory readings
export function usePerformanceMonitor() {
  // State holding the current frames-per-second
  const [fps, setFps] = useState(0);
  // State holding the current JS heap memory in MB (null if unsupported)
  const [memory, setMemory] = useState(null);

  // Effect that runs the sampling loop once on mount
  useEffect(() => {
    // Frame counter since the last sample
    let frames = 0;
    // Timestamp of the previous sample
    let prevTime = performance.now();
    // Id of the current animation frame
    let frameId;

    // The sampling loop
    const loop = () => {
      // Increment the frame counter
      frames++;
      // Current timestamp
      const time = performance.now();

      // Once at least one second has elapsed, update readings
      if (time >= prevTime + 1000) {
        // Compute and store the FPS (rounded)
        setFps(Math.round((frames * 1000) / (time - prevTime)));
        // Reset the frame counter
        frames = 0;
        // Reset the sample timestamp
        prevTime = time;

        // If the browser exposes memory info
        if (performance.memory) {
          // Read the used JS heap size in bytes
          const usedHeap = performance.memory.usedJSHeapSize;
          // Convert bytes to megabytes (rounded)
          const usedMB = Math.round(usedHeap / (1024 * 1024));
          // Store the memory reading
          setMemory(usedMB);
        }
      }
      // Schedule the next frame
      frameId = requestAnimationFrame(loop);
    };

    // Start the sampling loop
    frameId = requestAnimationFrame(loop);
    // Cancel the loop on cleanup
    return () => cancelAnimationFrame(frameId);
  }, []);

  // Return the current fps and memory values
  return { fps, memory };
}