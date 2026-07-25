// File: src/App.jsx
// Description: Root application component. Sets up the React Three Fiber
// Canvas for rendering the 3D model, mounts the SettingsPanel, HUD, and
// TrackingOverlay, and wires UI store flags (antialias, shadows, HDRI) into
// the renderer and lighting environment.

import TrackingOverlay from "./Components/TrackingOverlay.jsx";
import HUD from "./Components/HUD.jsx";
import "./App.css";
import { Canvas } from "@react-three/fiber";
import ModelViewer from "./Components/ModelViewer.jsx";
import { Stage } from "@react-three/drei";
import { Toaster } from "react-hot-toast";
import SettingsPanel from "./Components/SettingsPanel.jsx";
import { useUIStore } from "./lib/globalStates.js";
import * as THREE from "three";

// Main App component that composes the 3D viewer, HUD, settings, and tracking overlay
export default function App() {
  // Read the antialias toggle from the UI store
  const enableAntialias = useUIStore((state) => state.enableAntialias);
  // Read the shadows toggle from the UI store
  const enableShadows = useUIStore((state) => state.enableShadows);
  // Read the HDRI environment toggle from the UI store
  const enableHDRI = useUIStore((state) => state.enableHDRI);

  return (
    // Root container with app-level padding and font styling
    <div className="app-container">
      {/* Toast notification container anchored to bottom-center */}
      <Toaster 
        position="bottom-center" 
        reverseOrder={false} 
        toastOptions={{ duration: 4000 }}
      />

      {/* Floating performance settings widget */}
      <SettingsPanel />

      {/* Main content area that holds the 3D canvas and HUD */}
      <main className="main-content">
        {/* React Three Fiber canvas for WebGL rendering */}
        <Canvas 
          // Remount the canvas when antialias/shadow settings change so GL options apply
          key={`canvas-${enableAntialias}-${enableShadows}`}
          // Allow device pixel ratio between 1 and 2 for sharpness/performance balance
          dpr={[1, 2]} 
          // Enable or disable shadow rendering based on the UI flag
          shadows={enableShadows} 
          // Configure the default camera position and field of view
          camera={{ position: [0, 0, 1], fov: 45 }}
          // Configure the WebGL renderer options
          gl={{
            // Toggle antialiasing on the GL context
            antialias: enableAntialias,
            // Request the high-performance GPU for rendering
            powerPreference: "high-performance", 
            // Keep the drawing buffer so frames can be captured for recording
            preserveDrawingBuffer: true
          }}
          // Callback fired once the GL context is created
          onCreated={({ gl }) => {
            // Enable THREE's global cache for textures/materials to improve performance
            THREE.Cache.enabled = true; 
          }}
        >
          {/* Stage wraps the model and provides lighting + optional HDRI environment */}
          <Stage environment={enableHDRI ? "city" : null} intensity={0.6}>
            {/* Render the 3D character/model inside the stage */}
            <ModelViewer />
          </Stage>
        </Canvas>

        {/* Render the head-up display control panel */}
        <HUD />
      </main>

      {/* Render the draggable face tracking overlay window */}
      <TrackingOverlay />
    </div>
  );
}