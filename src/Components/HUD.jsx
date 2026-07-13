// src/Components/HUD.jsx
import { useState, useRef } from "react";
import { useFaceStore, useUIStore } from "../lib/globalStates.js";
import CalibrateButton from "./CalibrateButton.jsx";
import MetricBar from "./MetricBar.jsx";
import { startRecording, stopRecording } from "../lib/recorder.js";
import { usePerformanceMonitor } from "./hooks/usePerformanceMonitor.js";
import ModelDataInspector from "./ModelDataInspector.jsx"
import "./styles/HUD.css";

// 📊 مكون عرض الأداء
function HUDStats() {
  const { fps, memory } = usePerformanceMonitor();

  // تحديد الكلاسات بناءً على الأداء بدلاً من كتابة الألوان مباشرة
  const fpsClass = fps >= 45 ? 'status-good' : (fps >= 30 ? 'status-warn' : 'status-danger');
  const memClass = memory && memory > 500 ? 'status-danger' : (memory > 300 ? 'status-warn' : 'status-good');

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


// 🎛️ المكون الرئيسي HUD
export default function HUD() {
  const { metrics } = useFaceStore();
  const {
    isHUDVisible, toggleHUD, landmarkMode, setLandmarkMode,
    isMirrored, toggleMirror, isRecording, setIsRecording,
    isGreenScreen, toggleGreenScreen, setModelUrl,
    appError, setAppError
  } = useUIStore();

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
          setAppError("فشل بدء التسجيل، يرجى التأكد من صلاحيات الميكروفون والكاميرا.");
        }
      }
    } catch (error) {
      setAppError(`حدث خطأ أثناء التسجيل: ${error.message}`);
      setIsRecording(false);
    }
  };

  const handleModelUpload = (event) => {
    const file = event.target.files?.[0]; // استخدام Optional Chaining للأمان
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".glb")) {
      setAppError("خطأ: التطبيق يدعم ملفات .glb فقط.");
      return;
    }

    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      setAppError("حجم الملف كبير جداً! الحد الأقصى المسموح به هو 50MB.");
      return;
    }

    try {
      const url = URL.createObjectURL(file);
      setModelUrl(url);
      event.target.value = null; // تصفير الـ input للسماح برفع نفس الملف مجدداً بعد التعديل
    } catch (error) {
      setAppError("فشلت عملية قراءة المجسم، قد يكون الملف تالفاً.");
    }
  };

  return (
    <>
      {/* رسائل الخطأ */}
      {appError && (
        <div className="error-toast-fixed">
          ⚠️ {appError}
        </div>
      )}

      {/* اللوحة الجانبية */}
      <div className={`side-panel ${isHUDVisible ? "open" : "closed"}`}>
        <button className="toggle-arrow" onClick={toggleHUD}>
          {isHUDVisible ? "▶" : "◀"}
        </button>

        <div className="panel-content">
          <h3 className="panel-title">Control Panel</h3>

          <HUDStats />

          <div className="metrics-group">
            <MetricBar label="Yaw Rotation" value={metrics.yaw} />
            <MetricBar label="Mouth Open" value={metrics.mouth} />
            <MetricBar label="Eye Blink" value={metrics.blink} />
          </div>

          <div className="nav-divider"></div>

          <div className="actions-group">
            {/* Input مخفي لرفع الملفات */}
            <input
              type="file"
              accept=".glb"
              ref={fileInputRef}
              className="hidden-file-input"
              onChange={handleModelUpload}
            />
            
            <button className="nav-btn load-btn" onClick={() => fileInputRef.current?.click()}>
              📁 Load Model
            </button>

            <button className={`nav-btn ${isMirrored ? "active" : ""}`} onClick={toggleMirror}>
              Mirror {isMirrored ? "ON" : "OFF"}
            </button>

            <button className={`nav-btn ${isGreenScreen ? "active" : ""}`} onClick={toggleGreenScreen}>
              Chroma {isGreenScreen ? "ON" : "OFF"}
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
}