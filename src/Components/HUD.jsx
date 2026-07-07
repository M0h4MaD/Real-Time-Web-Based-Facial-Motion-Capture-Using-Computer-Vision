// src/Components/HUD.jsx
import { useFaceStore, useUIStore } from "../lib/globalStates.js";
import CalibrateButton from "./CalibrateButton.jsx";
import MetricBar from "./MetricBar.jsx"; // استيراد المكون الجديد
import "./styles/HUD.css";

export default function HUD() {
  const { metrics } = useFaceStore();
  const { isHUDVisible, toggleHUD, toggleLandmarks } = useUIStore();

  return (
    <>
      {/* الأزرار أصبحت هنا، أي تغيير فيها سيؤثر على هذا المكون فقط */}
      <button className="toggle-btn" onClick={toggleHUD}>
        {isHUDVisible ? "Hide HUD" : "Show HUD"}
      </button>
      <button className="toggle-btn" onClick={toggleLandmarks}>
        Toggle Landmarks
      </button>

      {isHUDVisible && (
        <div className="hud-panel">
          <h3 className="panel-title">System Status</h3>
        
          {/* هنا بنستخدم المكون بكل بساطة */}
          <MetricBar label="Yaw Rotation" value={metrics.yaw} />
          <MetricBar label="Mouth Open" value={metrics.mouth} />
          <MetricBar label="Eye Blink" value={metrics.blink} />

          <div className="action-zone">
            <CalibrateButton />
          </div>
        </div>
      )}
    </>
  );
}
