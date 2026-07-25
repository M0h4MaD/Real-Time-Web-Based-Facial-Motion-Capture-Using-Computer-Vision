// File: src/Components/HUD.jsx
// Description: The main control panel (sidebar). Displays live performance
// stats, face-metric bars, model loading, mirror/chroma/landmark toggles,
// recording controls, and the model blendshape inspector. Wraps many child
// components and reads/writes the UI store.

import React, { useState, useRef } from "react";
import { useUIStore } from "../lib/globalStates.js";
import CalibrateButton from "./CalibrateButton.jsx";
import MetricBar from "./MetricBar.jsx";
import { startRecording, stopRecording } from "../lib/recorder.js";
import { usePerformanceMonitor } from "./hooks/usePerformanceMonitor.js";
import ModelDataInspector from "./ModelDataInspector.jsx";
import "./styles/HUD.css";

// Sub-component that shows live FPS and memory stats
function HUDStats() {
  // Get fps and memory from the performance monitor hook
  const { fps, memory } = usePerformanceMonitor();
  // Choose a status class for fps based on thresholds
  const fpsClass =
    fps >= 45 ? "status-good" : fps >= 30 ? "status-warn" : "status-danger";
  // Choose a status class for memory based on thresholds
  const memClass =
    memory && memory > 500
      ? "status-danger"
      : memory > 300
        ? "status-warn"
        : "status-good";

  return (
    // Container for the stats rows
    <div className="hud-stats-container">
      {/* Row showing system FPS with colored status */}
      <div className="stats-row">
        <span>System FPS</span>
        <span className={`stats-value ${fpsClass}`}>{fps}</span>
      </div>
      {/* Conditionally render memory row if available */}
      {memory !== null && (
        <div className="stats-row">
          <span>App Memory</span>
          <span className={`stats-value ${memClass}`}>{memory} MB</span>
        </div>
      )}
    </div>
  );
}

// The main HUD component
const HUD = () => {
  // Atomic store subscriptions to prevent unnecessary re-renders
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

  // Local state for the selected recording mode
  const [recordMode, setRecordMode] = useState("keyframes");
  // Ref to the hidden file input element
  const fileInputRef = useRef(null);

  // Handler to start or stop recording based on current state
  const handleRecordToggle = async () => {
    try {
      if (isRecording) {
        // Stop current recording
        stopRecording();
        setIsRecording(false);
      } else {
        // Attempt to start recording in the selected mode
        const success = await startRecording(recordMode);
        if (success) {
          setIsRecording(true);
        } else {
          // Show error if start failed (e.g. mic permission denied)
          setAppError(
            "فشل بدء التسجيل، يرجى التأكد من صلاحيات الميكروفون والكاميرا.",
          );
        }
      }
    } catch (error) {
      // Show a generic error and reset the flag
      setAppError(`حدث خطأ أثناء التسجيل: ${error.message}`);
      setIsRecording(false);
    }
  };

  // Handler for model file upload
  const handleModelUpload = (event) => {
    // Get the first selected file (if any)
    const file = event.target.files?.[0];
    // Bail if no file was chosen
    if (!file) return;

    // Reject non-.glb files
    if (!file.name.toLowerCase().endsWith(".glb")) {
      setAppError("خطأ: التطبيق يدعم ملفات .glb فقط.");
      return;
    }

    // Maximum allowed file size (50MB)
    const maxSize = 50 * 1024 * 1024;
    // Reject files larger than the limit
    if (file.size > maxSize) {
      setAppError("حجم الملف كبير جداً! الحد الأقصى المسموح به هو 50MB.");
      return;
    }

    try {
      // Create an object URL for the uploaded model
      const url = URL.createObjectURL(file);
      // Update the model URL in the store
      setModelUrl(url);
      // Reset the file input so the same file can be re-selected
      event.target.value = null;
    } catch (error) {
      // Show an error if reading the model failed
      setAppError("فشلت عملية قراءة المجسم، قد يكون الملف تالفاً.");
    }
  };

  return (
    // Fragment wrapper (no extra DOM node)
    <>
      {/* Side panel that is open or closed based on visibility */}
      <div className={`side-panel ${isHUDVisible ? "open" : "closed"}`}>
        {/* Button to collapse/expand the panel */}
        <button className="toggle-arrow" onClick={toggleHUD}>
          {isHUDVisible ? "▶" : "◀"}
        </button>

        {/* The scrollable panel content */}
        <div className="panel-content">
          {/* Panel heading */}
          <h3 className="panel-title">Control Panel</h3>

          {/* Live performance stats */}
          <HUDStats />

          {/* Group of metric bars for face metrics */}
          <div className="metrics-group">
            {/* Yaw rotation metric bar */}
            <MetricBar label="Yaw Rotation" metricKey="yaw" />
            {/* Mouth open metric bar */}
            <MetricBar label="Mouth Open" metricKey="mouth" />
            {/* Eye blink metric bar */}
            <MetricBar label="Eye Blink" metricKey="blink" />
          </div>

          {/* Visual divider between sections */}
          <div className="nav-divider"></div>

          {/* Group of action buttons */}
          <div className="actions-group">
            {/* Hidden file input for loading a model */}
            <input
              type="file"
              accept=".glb"
              ref={fileInputRef}
              className="hidden-file-input"
              onChange={handleModelUpload}
            />

            {/* Button that opens the file dialog */}
            <button
              className="nav-btn load-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              📁 Load Model
            </button>

            {/* Mirror toggle button */}
            <button
              className={`nav-btn ${isMirrored ? "active" : ""}`}
              onClick={toggleMirror}
            >
              Mirror {isMirrored ? "ON" : "OFF"}
            </button>

            {/* Chroma / green-screen toggle button */}
            <button
              className={`nav-btn ${isGreenScreen ? "active" : ""}`}
              onClick={toggleGreenScreen}
            >
              Chroma {isGreenScreen ? "ON" : "OFF"}
            </button>

            {/* Dropdown to choose landmark overlay mode */}
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

            {/* Calibration button */}
            <CalibrateButton />

            {/* Visual divider */}
            <div className="nav-divider"></div>

            {/* Recording controls section */}
            <div className="record-section">
              {/* Dropdown to choose recording mode */}
              <select
                className="record-select"
                value={recordMode}
                onChange={(e) => setRecordMode(e.target.value)}
                disabled={isRecording}
              >
                <option value="keyframes">JSON (Mocap)</option>
                <option value="video">WEBM (Video + Mic)</option>
              </select>

              {/* Record / stop button */}
              <button
                className={`nav-btn record-btn ${isRecording ? "recording" : ""}`}
                onClick={handleRecordToggle}
              >
                {isRecording ? "Stop REC ⏹" : "Record ⏺"}
              </button>
            </div>

            {/* Visual divider */}
            <div className="nav-divider"></div>

            {/* Blendshape inspector */}
            <ModelDataInspector />
          </div>
        </div>
      </div>
    </>
  );
};

// Memoize the HUD to avoid unnecessary re-renders
export default React.memo(HUD);