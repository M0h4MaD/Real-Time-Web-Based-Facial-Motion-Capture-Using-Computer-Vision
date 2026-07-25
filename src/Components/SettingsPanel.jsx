// File: src/Components/SettingsPanel.jsx
// Description: Floating performance settings widget (top-left). Lets the user
// toggle camera resolution, tracking FPS, pixel ratio, hair physics, HDRI,
// antialiasing, shadows, and clear the THREE cache.

import { useUIStore } from "../lib/globalStates.js";
import * as THREE from "three";
import toast from "react-hot-toast";
import "./styles/SettingsPanel.css"; // استيراد ملف التنسيق

export default function SettingsPanel() {
  const isSettingsOpen = useUIStore((state) => state.isSettingsOpen);
  const toggleSettings = useUIStore((state) => state.toggleSettings);
  const pixelRatio = useUIStore((state) => state.pixelRatio);
  const setPixelRatio = useUIStore((state) => state.setPixelRatio);
  const enableHairPhysics = useUIStore((state) => state.enableHairPhysics);
  const setEnableHairPhysics = useUIStore((state) => state.setEnableHairPhysics);
  const cameraResolution = useUIStore((state) => state.cameraResolution);
  const setCameraResolution = useUIStore((state) => state.setCameraResolution);
  const enableAntialias = useUIStore((state) => state.enableAntialias);
  const toggleAntialias = useUIStore((state) => state.toggleAntialias);
  const enableShadows = useUIStore((state) => state.enableShadows);
  const toggleShadows = useUIStore((state) => state.toggleShadows);
  const enableHDRI = useUIStore((state) => state.enableHDRI);
  const toggleHDRI = useUIStore((state) => state.toggleHDRI);
  const trackingFPS = useUIStore((state) => state.trackingFPS);
  const setTrackingFPS = useUIStore((state) => state.setTrackingFPS);

  const handleClearCache = () => {
    THREE.Cache.clear();
    toast.success("Memory Optimized & Cache Cleared! 🧹", {
      style: {
        background: "#222",
        color: "#10b981",
        border: "1px solid #10b981",
      },
    });
  };

  return (
    <div className="settings-widget">
      <button
        onClick={toggleSettings}
        className={`settings-toggle-btn ${isSettingsOpen ? "is-open" : ""}`}
        title="Performance Settings"
      >
        ⚙️
      </button>

      {isSettingsOpen && (
        <div className="settings-dropdown">
          <h3 className="settings-title">PERFORMANCE</h3>

          <div className="settings-section">
            <label className="settings-label">📹 Camera Resolution</label>
            <select
              value={cameraResolution}
              onChange={(e) => setCameraResolution(e.target.value)}
              className="settings-select"
            >
              <option value="320x240">Low (320x240)</option>
              <option value="640x480">Medium (640x480)</option>
              <option value="1280x720">High (1280x720)</option>
            </select>
          </div>

          <div className="settings-section">
            <label className="settings-label">
              🎯 Tracking FPS:{" "}
              <span className="highlight-green">{trackingFPS}</span>
            </label>
            <select
              value={trackingFPS}
              onChange={(e) => setTrackingFPS(e.target.value)}
              className="settings-select"
            >
              <option value={15}>15 FPS (Power Saver)</option>
              <option value={20}>20 FPS (Smooth Enough)</option>
              <option value={25}>25 FPS (Balanced)</option>
              <option value={30}>30 FPS (High Performance)</option>
              <option value={60}>MAX (60 FPS)</option>
            </select>
          </div>

          <div className="settings-section">
            <label className="settings-label">
              🖥️ Render Quality:{" "}
              <span className="highlight-purple">{pixelRatio}</span>
            </label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={pixelRatio}
              onChange={(e) => setPixelRatio(e.target.value)}
              className="settings-range"
            />
          </div>

          <div className="settings-section grouped">
            <div className="settings-toggle-row">
              <label className="settings-toggle-label" htmlFor="hairToggle">
                💨 Hair Physics
              </label>
              <input
                id="hairToggle"
                type="checkbox"
                checked={enableHairPhysics}
                onChange={(e) => setEnableHairPhysics(e.target.checked)}
                className="settings-checkbox"
              />
            </div>
            <div className="settings-toggle-row">
              <label className="settings-toggle-label" htmlFor="hdriToggle">
                🌍 HDRI Environment
              </label>
              <input
                id="hdriToggle"
                type="checkbox"
                checked={enableHDRI}
                onChange={toggleHDRI}
                className="settings-checkbox"
              />
            </div>
            <div className="settings-toggle-row">
              <label className="settings-toggle-label" htmlFor="aaToggle">
                ✨ Antialiasing
              </label>
              <input
                id="aaToggle"
                type="checkbox"
                checked={enableAntialias}
                onChange={toggleAntialias}
                className="settings-checkbox"
              />
            </div>

            <div className="settings-toggle-row">
              <label className="settings-toggle-label" htmlFor="shadowToggle">
                🌑 Shadows
              </label>
              <input
                id="shadowToggle"
                type="checkbox"
                checked={enableShadows}
                onChange={toggleShadows}
                className="settings-checkbox"
              />
            </div>
          </div>

          <button onClick={handleClearCache} className="settings-clear-btn">
            🧹 Clear Memory Cache
          </button>
        </div>
      )}
    </div>
  );
}