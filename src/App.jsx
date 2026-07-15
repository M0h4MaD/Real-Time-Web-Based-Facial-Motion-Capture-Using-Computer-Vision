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

export default function App() {
  const enableAntialias = useUIStore((state) => state.enableAntialias);
  const enableShadows = useUIStore((state) => state.enableShadows);
  
  // ⚡ استدعاء حالة الـ HDRI
  const enableHDRI = useUIStore((state) => state.enableHDRI);

  return (
    <div className="app-container">
      <Toaster 
        position="bottom-center" 
        reverseOrder={false} 
        toastOptions={{
          duration: 4000,
        }}
      />

      <SettingsPanel />

      <main className="main-content">
        <Canvas 
          key={`canvas-${enableAntialias}-${enableShadows}`}
          dpr={[1, 2]} 
          shadows={enableShadows} 
          camera={{ position: [0, 0, 1], fov: 45 }}
          gl={{
            antialias: enableAntialias,
            powerPreference: "high-performance", 
            preserveDrawingBuffer: true
          }}
          onCreated={({ gl }) => {
            THREE.Cache.enabled = true; 
          }}
        >
          {/* ⚡ ربط حالة الـ HDRI بـ environment الخاص بالـ Stage */}
          <Stage environment={enableHDRI ? "city" : null} intensity={0.6}>
            <ModelViewer />
          </Stage>
        </Canvas>

        <HUD />
      </main>

      <TrackingOverlay />
    </div>
  );
}