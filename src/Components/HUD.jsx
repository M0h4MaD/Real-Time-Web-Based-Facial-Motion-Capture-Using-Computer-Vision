// src/Components/HUD.jsx
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
    toggleLandmarks,
    isMirrored,
    toggleMirror,
    isRecording,
    setIsRecording,
    isGreenScreen,
    toggleGreenScreen
  } = useUIStore();

  const handleRecordToggle = () => {
    if (isRecording) {
      stopRecording();
      setIsRecording(false);
    } else {
      startRecording();
      setIsRecording(true);
    }
  };

  return (
    <>
      <button className="toggle-hud-top" onClick={toggleHUD}>
        {isHUDVisible ? "Hide UI" : "Show UI"}
      </button>

      {isHUDVisible && (
        <div className="floating-navbar">
          <div className="metrics-group">
            {/* نمرر الأرقام الخام كما هي، وMetricBar سيتكفل بالباقي */}
            <MetricBar label="Yaw Rotation" value={metrics.yaw} />
            <MetricBar label="Mouth Open" value={metrics.mouth} />
            <MetricBar label="Eye Blink" value={metrics.blink} />
          </div>

          <div className="nav-divider"></div>

          <div className="actions-group">
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

            <button className="nav-btn" onClick={toggleLandmarks}>
              Landmarks
            </button>
            
            <CalibrateButton />

            <button 
              className={`nav-btn record-btn ${isRecording ? "recording" : ""}`} 
              onClick={handleRecordToggle}
            >
              {isRecording ? "Stop REC ⏹" : "Record ⏺"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}