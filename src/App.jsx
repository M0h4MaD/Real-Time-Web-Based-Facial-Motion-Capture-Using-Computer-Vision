// src/App.jsx
import TrackingOverlay from "./Components/TrackingOverlay.jsx";
import HUD from "./Components/HUD.jsx";

import "./App.css";
import { Canvas } from "@react-three/fiber";
import ModelViewer from "./Components/ModelViewer.jsx";
import { Stage } from "@react-three/drei";

// App.jsx (نظيف جداً)
export default function App() {
  return (
    <div className="app-container">
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