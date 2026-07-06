// src/App.jsx
import TrackingOverlay from "./Components/TrackingOverlay.jsx";
import HUD from "./Components/HUD.jsx";
import { useUIStore } from "./lib/globalStates.js"; // Importing the new UI Store
import "./App.css";

export default function App() {
  // Get the HUD visibility state and toggle function from the store
  const { isHUDVisible, toggleHUD } = useUIStore();
  const toggleLandmarks = useUIStore((state) => state.toggleLandmarks);

  return (
    <div className="app-container">
      {/* Toggle button to show/hide HUD */}
      <button className="toggle-btn" onClick={toggleHUD}>
        {isHUDVisible ? "Hide HUD" : "Show HUD"}
      </button>

      <button className="toggle-btn" onClick={toggleLandmarks}>Toggle Landmarks</button>

      <main className="main-content">
        <h2>3D Tracking Space</h2>

        {/* Conditional rendering: HUD only displays if isHUDVisible is true */}
        {isHUDVisible && <HUD />}
      </main>

      {/* The TrackingOverlay remains running in the background */}
      <TrackingOverlay />
    </div>
  );
}
