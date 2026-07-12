// src/Components/HUD.jsx
import { useState, useRef } from "react";
import { useFaceStore, useUIStore } from "../lib/globalStates.js";
import CalibrateButton from "./CalibrateButton.jsx";
import MetricBar from "./MetricBar.jsx";
import { startRecording, stopRecording } from "../lib/recorder.js";
import "./styles/HUD.css";

export default function HUD() {
  const { metrics } = useFaceStore();
  const {
    isHUDVisible,
    toggleHUD,
    landmarkMode,
    setLandmarkMode, // 🔥 التعديل هنا
    isMirrored,
    toggleMirror,
    isRecording,
    setIsRecording,
    isGreenScreen,
    toggleGreenScreen,
    setModelUrl,
  } = useUIStore();

  const [recordMode, setRecordMode] = useState("keyframes");
  const fileInputRef = useRef(null);

  const handleRecordToggle = async () => {
    if (isRecording) {
      stopRecording();
      setIsRecording(false);
    } else {
      const success = await startRecording(recordMode);
      if (success) setIsRecording(true);
    }
  };

  const handleModelUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.name.endsWith(".glb")) {
      const url = URL.createObjectURL(file);
      setModelUrl(url);
    } else {
      alert("الرجاء اختيار ملف بصيغة .glb");
    }
  };

  return (
    /* اللوحة الجانبية، تأخذ كلاس open أو closed بناءً على الحالة */
    <div className={`side-panel ${isHUDVisible ? "open" : "closed"}`}>
      {/* زر السهم الملتصق باللوحة */}
      <button className="toggle-arrow" onClick={toggleHUD}>
        {isHUDVisible ? "▶" : "◀"}
      </button>

      {/* محتوى اللوحة */}
      <div className="panel-content">
        <h3 className="panel-title">Control Panel</h3>

        <div className="metrics-group">
          <MetricBar label="Yaw Rotation" value={metrics.yaw} />
          <MetricBar label="Mouth Open" value={metrics.mouth} />
          <MetricBar label="Eye Blink" value={metrics.blink} />
        </div>

        <div className="nav-divider"></div>

        <div className="actions-group">
          <input
            type="file"
            accept=".glb"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={handleModelUpload}
          />
          <button
            className="nav-btn load-btn"
            onClick={() => fileInputRef.current.click()}
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

          <select
            className="nav-btn"
            value={landmarkMode}
            onChange={(e) => setLandmarkMode(e.target.value)}
            style={{ textAlign: "center", appearance: "none" }} // لإخفاء سهم المتصفح الافتراضي وجعل النص بالمنتصف
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

          {/* قسم التسجيل مرتب عمودياً */}
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
        </div>
      </div>
    </div>
  );
}
