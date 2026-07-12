// src/Components/CalibrateButton.jsx
import { useFaceStore } from '../lib/globalStates';

export default function CalibrateButton() {
  const triggerCalibration = useFaceStore((state) => state.triggerCalibration);
  const isCalibrating = useFaceStore((state) => state.isCalibrating);
  const hasBaseline = useFaceStore((state) => state.calibrationBaseline !== null);

  // تحديد لون الزر بناءً على الحالة
  let bgColor = '#4f46e5'; // أزرق افتراضي
  if (isCalibrating) bgColor = '#f59e0b'; // برتقالي أثناء المعايرة
  else if (hasBaseline) bgColor = '#10b981'; // أخضر عند النجاح

  return (
    <button
      onClick={triggerCalibration}
      disabled={isCalibrating}
      style={{
        padding: '10px 20px', 
        borderRadius: '8px', 
        fontWeight: 'bold', 
        color: 'white',
        border: 'none', 
        cursor: isCalibrating ? 'not-allowed' : 'pointer',
        backgroundColor: bgColor, 
        transition: 'all 0.3s ease'
      }}
    >
      {isCalibrating ? 'جاري لقط الملامح...' : hasBaseline ? 'Calibrated ✓' : 'Calibrate'}
    </button>
  );
}