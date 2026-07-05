// src/Components/HUD.jsx
import { useFaceStore } from '../lib/globalStates.js';
import MetricBar from './MetricBar.jsx'; // استيراد المكون الجديد
import './styles/HUD.css';

export default function HUD() {
  const metrics = useFaceStore((state) => state.metrics);

  return (
    <div className="hud-panel">
      <h3 className='panel-title'>System Status</h3>
      
      {/* هنا بنستخدم المكون بكل بساطة */}
      <MetricBar label="Yaw Rotation" value={metrics.yaw} />
      <MetricBar label="Mouth Open" value={metrics.mouth} />
      <MetricBar label="Eye Blink" value={metrics.blink} />

      <div className="action-zone">
        <button className="btn-small">Calibrate</button>
      </div>
    </div>
  );
}