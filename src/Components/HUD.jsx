// src/Components/HUD.jsx
import React, { useState, useRef } from "react";
import { useUIStore } from "../lib/globalStates.js";
import CalibrateButton from "./CalibrateButton.jsx";
import MetricBar from "./MetricBar.jsx";
import { startRecording, stopRecording } from "../lib/recorder.js";
import { usePerformanceMonitor } from "./hooks/usePerformanceMonitor.js";
import ModelDataInspector from "./ModelDataInspector.jsx";
import "./styles/HUD.css";

function HUDStats() {
  const { fps, memory } = usePerformanceMonitor();
  const fpsClass =
    fps >= 45 ? "status-good" : fps >= 30 ? "status-warn" : "status-danger";
  const memClass =
    memory && memory > 500
      ? "status-danger"
      : memory > 300
        ? "status-warn"
        : "status-good";

  return (
    <div className="hud-stats-container">
      <div className="stats-row">
        <span>System FPS</span>
        <span className={`stats-value ${fpsClass}`}>{fps}</span>
      </div>
      {memory !== null && (
        <div className="stats-row">
          <span>App Memory</span>
          <span className={`stats-value ${memClass}`}>{memory} MB</span>
        </div>
      )}
    </div>
  );
}

const HUD = () => {
  // ⚡ استدعاء مفصول للحالات (Atomic) لمنع إعادة التصيير العشوائية
  const isHUDVisible = useUIStore((state) => state.isHUDVisible);
  const toggleHUD = useUIStore((state) => state.toggleHUD);
  const landmarkMode = useUIStore((state) => state.landmarkMode);
  const setLandmarkMode = useUIStore((state) => state.setLandmarkMode);
  const isMirrored = useUIStore((state) => state.isMirrored);
  const toggleMirror = useUIStore((state) => state.toggleMirror);
  const isRecording = useUIStore((state) => state.isRecording);
  const setIsRecording = useUIStore((state) => state.setIsRecording);
  const isGreenScreen = useUIStore((state) => state.isGreenScreen);
  const toggleGreenScreen = useUIStore((state) => state.toggleGreenScreen);
  const setModelUrl = useUIStore((state) => state.setModelUrl);
  const setAppError = useUIStore((state) => state.setAppError);
  const isLowEndMode = useUIStore((state) => state.isLowEndMode);
  const toggleLowEndMode = useUIStore((state) => state.toggleLowEndMode);

  const [recordMode, setRecordMode] = useState("keyframes");
  const fileInputRef = useRef(null);

  const handleRecordToggle = async () => {
    try {
      if (isRecording) {
        stopRecording();
        setIsRecording(false);
      } else {
        const success = await startRecording(recordMode);
        if (success) {
          setIsRecording(true);
        } else {
          setAppError(
            "فشل بدء التسجيل، يرجى التأكد من صلاحيات الميكروفون والكاميرا.",
          );
        }
      }
    } catch (error) {
      setAppError(`حدث خطأ أثناء التسجيل: ${error.message}`);
      setIsRecording(false);
    }
  };

  const handleModelUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".glb")) {
      setAppError("خطأ: التطبيق يدعم ملفات .glb فقط.");
      return;
    }

    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      setAppError("حجم الملف كبير جداً! الحد الأقصى المسموح به هو 50MB.");
      return;
    }

    try {
      const url = URL.createObjectURL(file);
      setModelUrl(url);
      event.target.value = null;
    } catch (error) {
      setAppError("فشلت عملية قراءة المجسم، قد يكون الملف تالفاً.");
    }
  };

  return (
    <>
      <div className={`side-panel ${isHUDVisible ? "open" : "closed"}`}>
        <button className="toggle-arrow" onClick={toggleHUD}>
          {isHUDVisible ? "▶" : "◀"}
        </button>

        <div className="panel-content">
          <h3 className="panel-title">Control Panel</h3>

          <HUDStats />

          <div className="metrics-group">
            <MetricBar label="Yaw Rotation" metricKey="yaw" />
            <MetricBar label="Mouth Open" metricKey="mouth" />
            <MetricBar label="Eye Blink" metricKey="blink" />
          </div>

          <div className="nav-divider"></div>

          <div className="actions-group">
            <input
              type="file"
              accept=".glb"
              ref={fileInputRef}
              className="hidden-file-input"
              onChange={handleModelUpload}
            />

            <button
              className="nav-btn load-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              📁 Load Model
            </button>

            <button
              className={`nav-btn ${isMirrored ? "active" : ""}`}
              onClick={toggleMirror}
            >
              Mirror {isMirrored ? "ON" : "OFF"}
            </button>

            <button
              className={`nav-btn ${isGreenScreen ? "active" : ""}`}
              onClick={toggleGreenScreen}
            >
              Chroma {isGreenScreen ? "ON" : "OFF"}
            </button>

            {/* ⚡ زر الأداء للأجهزة الضعيفة */}
            <button
              className={`nav-btn ${isLowEndMode ? "active" : ""}`}
              onClick={toggleLowEndMode}
              style={
                isLowEndMode
                  ? { border: "1px solid #f59e0b", color: "#f59e0b" }
                  : {}
              }
            >
              🚀 Boost FPS {isLowEndMode ? "ON" : "OFF"}
            </button>

            <select
              className="nav-btn landmark-select"
              value={landmarkMode}
              onChange={(e) => setLandmarkMode(e.target.value)}
            >
              <option value="off">🚫 Landmarks OFF</option>
              <option value="all">🟢 Points + Wireframe</option>
              <option value="wireframe">🕸️ Just Wireframe</option>
              <option value="points">📍 Just Points</option>
              <option value="mouth">👄 Mouth Only</option>
              <option value="eyes">👁️ Eyes Only</option>
              <option value="cyberpunk">⚡ Cyberpunk Scanner</option>
            </select>

            <CalibrateButton />

            <div className="nav-divider"></div>

            <div className="record-section">
              <select
                className="record-select"
                value={recordMode}
                onChange={(e) => setRecordMode(e.target.value)}
                disabled={isRecording}
              >
                <option value="keyframes">JSON (Mocap)</option>
                <option value="video">WEBM (Video + Mic)</option>
              </select>

              <button
                className={`nav-btn record-btn ${isRecording ? "recording" : ""}`}
                onClick={handleRecordToggle}
              >
                {isRecording ? "Stop REC ⏹" : "Record ⏺"}
              </button>
            </div>

            <div className="nav-divider"></div>

            <ModelDataInspector />
          </div>
        </div>
      </div>
    </>
  );
};

export default React.memo(HUD);
