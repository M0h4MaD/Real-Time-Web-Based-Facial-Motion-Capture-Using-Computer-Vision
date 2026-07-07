
import { useFaceStore } from '../lib/globalStates';

export default function CalibrateButton() {
  const triggerCalibration = useFaceStore((state) => state.triggerCalibration);
  const isCalibrating = useFaceStore((state) => state.isCalibrating);
  const hasBaseline = useFaceStore((state) => state.calibrationBaseline !== null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      <button
        onClick={triggerCalibration}
        disabled={isCalibrating}
        style={{
          padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', color: 'white',
          border: 'none', cursor: isCalibrating ? 'not-allowed' : 'pointer',
          backgroundColor: isCalibrating ? '#f59e0b' : '#4f46e5', transition: 'all 0.2s'
        }}
      >
        {isCalibrating ? 'جاري لقط ملامح الوجه...' : 'اضبط المعايرة (Calibrate)'}
      </button>
      {hasBaseline && !isCalibrating && (
        <span style={{ fontSize: '13px', color: '#10b981', fontWeight: 'bold' }}>✓ تم قفل الأبعاد بنجاح</span>
      )}
    </div>
  );
}