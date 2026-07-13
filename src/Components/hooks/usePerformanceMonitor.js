// src/hooks/usePerformanceMonitor.js
import { useState, useEffect } from "react";

export function usePerformanceMonitor() {
  const [fps, setFps] = useState(0);
  const [memory, setMemory] = useState(null);

  useEffect(() => {
    let frames = 0;
    let prevTime = performance.now();
    let frameId;

    const loop = () => {
      frames++;
      const time = performance.now();
      
      if (time >= prevTime + 1000) {
        setFps(Math.round((frames * 1000) / (time - prevTime)));
        frames = 0;
        prevTime = time;

        if (performance.memory) {
          const usedHeap = performance.memory.usedJSHeapSize;
          const usedMB = Math.round(usedHeap / (1024 * 1024)); 
          setMemory(usedMB);
        }
      }
      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, []);

  return { fps, memory };
}