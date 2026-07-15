// src/App.jsx
import TrackingOverlay from "./Components/TrackingOverlay.jsx";
import HUD from "./Components/HUD.jsx";

import "./App.css";
import { Canvas } from "@react-three/fiber";
import ModelViewer from "./Components/ModelViewer.jsx";
import { Stage } from "@react-three/drei";
import { Toaster } from "react-hot-toast"; // ⚡ إضافة التوست
import SettingsPanel from "./Components/SettingsPanel.jsx";

// App.jsx (نظيف جداً)
export default function App() {
  return (
    <div className="app-container">
      {/* ⚡ نظام الإشعارات يطفو فوق كل شيء */}
      <Toaster 
        position="bottom-center" 
        reverseOrder={false} 
        toastOptions={{
          duration: 4000,
        }}
      />

        <SettingsPanel />

      <main className="main-content">
        <Canvas dpr={[1, 2]} shadows camera={{position:[0,0,1], fov: 45 }}>
          <Stage environment="city" intensity={0.6}>
            <ModelViewer />
          </Stage>
        </Canvas>

        {/* HUD component that displays UI */}
        <HUD />
      </main>

      <TrackingOverlay />
    </div>
  );
}