// src/Components/SettingsPanel.jsx
import React from "react";
import { useUIStore } from "../lib/globalStates.js";
import * as THREE from "three";
import toast from "react-hot-toast";

export default function SettingsPanel() {
  const {
    isSettingsOpen,
    toggleSettings,
    pixelRatio,
    setPixelRatio,
    enableHairPhysics,
    setEnableHairPhysics,
    cameraResolution,
    setCameraResolution,
    enableAntialias,
    toggleAntialias,
    enableShadows,
    toggleShadows,
    enableHDRI,
    toggleHDRI,
    isVideoVisible,
    toggleVideoVisibility,
  } = useUIStore();

  const handleClearCache = () => {
    // ⚡ مسح الذاكرة المؤقتة لمحرك Three.js
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
    <div
      className="settings-widget"
      style={{
        position: "absolute",
        top: "15px",
        left: "15px",
        zIndex: 9000,
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <button
        onClick={toggleSettings}
        style={{
          background: isSettingsOpen ? "#4ade80" : "rgba(20, 20, 22, 0.95)",
          color: isSettingsOpen ? "#000" : "#fff",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "8px",
          width: "40px",
          height: "40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          fontSize: "18px",
          boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
          transition: "all 0.2s ease",
        }}
        title="Performance Settings"
      >
        ⚙️
      </button>

      {isSettingsOpen && (
        <div
          style={{
            position: "absolute",
            top: "50px",
            left: "0",
            background: "rgba(20, 20, 22, 0.95)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "8px",
            padding: "15px",
            width: "230px",
            boxShadow: "5px 5px 25px rgba(0,0,0,0.5)",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            animation: "fadeIn 0.2s ease-out",
            boxSizing: "border-box",
          }}
        >
          <h3
            style={{
              margin: "0",
              fontSize: "13px",
              color: "#fff",
              borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
              paddingBottom: "8px",
              textAlign: "center",
              fontWeight: "600",
              letterSpacing: "0.5px",
            }}
          >
            PERFORMANCE
          </h3>

          <div
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              padding: "10px",
              borderRadius: "8px",
              border: "1px solid rgba(255, 255, 255, 0.05)",
            }}
          >
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "12px",
                color: "#e2e8f0",
                fontWeight: "500",
              }}
            >
              📹 Camera Resolution
            </label>
            <select
              value={cameraResolution}
              onChange={(e) => setCameraResolution(e.target.value)}
              style={{
                width: "100%",
                padding: "6px",
                borderRadius: "6px",
                background: "#2a2a2f",
                color: "white",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                outline: "none",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              <option value="320x240">Low (320x240)</option>
              <option value="640x480">Medium (640x480)</option>
              <option value="1280x720">High (1280x720)</option>
            </select>
          </div>

          <div
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              padding: "10px",
              borderRadius: "8px",
              border: "1px solid rgba(255, 255, 255, 0.05)",
            }}
          >
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "12px",
                color: "#e2e8f0",
                fontWeight: "500",
              }}
            >
              🖥️ Render Quality:{" "}
              <span style={{ color: "#c084fc", fontWeight: "bold" }}>
                {pixelRatio}
              </span>
            </label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={pixelRatio}
              onChange={(e) => setPixelRatio(e.target.value)}
              style={{
                width: "100%",
                cursor: "pointer",
                accentColor: "#a855f7",
              }}
            />
          </div>

          {/* ⚡ التبديلات الجديدة (Toggles) */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              background: "rgba(255, 255, 255, 0.03)",
              padding: "10px",
              borderRadius: "8px",
              border: "1px solid rgba(255, 255, 255, 0.05)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <label
                style={{
                  fontSize: "12px",
                  color: "#e2e8f0",
                  cursor: "pointer",
                }}
                htmlFor="hairToggle"
              >
                💨 Hair Physics
              </label>
              <input
                id="hairToggle"
                type="checkbox"
                checked={enableHairPhysics}
                onChange={(e) => setEnableHairPhysics(e.target.checked)}
                style={{ cursor: "pointer", accentColor: "#a855f7" }}
              />
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <label
                style={{
                  fontSize: "12px",
                  color: "#e2e8f0",
                  cursor: "pointer",
                }}
                htmlFor="hdriToggle"
              >
                🌍 HDRI Environment
              </label>
              <input
                id="hdriToggle"
                type="checkbox"
                checked={enableHDRI}
                onChange={toggleHDRI}
                style={{ cursor: "pointer", accentColor: "#a855f7" }}
              />
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <label
                style={{
                  fontSize: "12px",
                  color: "#e2e8f0",
                  cursor: "pointer",
                }}
                htmlFor="aaToggle"
              >
                ✨ Antialiasing
              </label>
              <input
                id="aaToggle"
                type="checkbox"
                checked={enableAntialias}
                onChange={toggleAntialias}
                style={{ cursor: "pointer", accentColor: "#a855f7" }}
              />
            </div>
                
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <label
                style={{
                  fontSize: "12px",
                  color: "#e2e8f0",
                  cursor: "pointer",
                }}
                htmlFor="shadowToggle"
              >
                🌑 Shadows
              </label>
              <input
                id="shadowToggle"
                type="checkbox"
                checked={enableShadows}
                onChange={toggleShadows}
                style={{ cursor: "pointer", accentColor: "#a855f7" }}
              />
            </div>
          </div>

          {/* ⚡ زر تفريغ الذاكرة */}
          <button
            onClick={handleClearCache}
            style={{
              width: "100%",
              padding: "8px",
              borderRadius: "6px",
              background: "#ef4444",
              color: "white",
              border: "none",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: "bold",
              marginTop: "5px",
            }}
          >
            🧹 Clear Memory Cache
          </button>
        </div>
      )}
    </div>
  );
}
