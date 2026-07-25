// File: src/Components/CalibrateButton.jsx
// Description: Button component that triggers face calibration. It reads
// calibration state from the face store and changes its color/label based on
// whether calibration is in progress or already completed.

import { useFaceStore } from '../lib/globalStates';

// CalibrateButton component that initiates face calibration
export default function CalibrateButton() {
  // Get the calibration trigger action from the face store
  const triggerCalibration = useFaceStore((state) => state.triggerCalibration);
  // Get whether calibration is currently running
  const isCalibrating = useFaceStore((state) => state.isCalibrating);
  // Determine if a calibration baseline has already been captured
  const hasBaseline = useFaceStore((state) => state.calibrationBaseline !== null);

  // Default button background color (blue)
  let bgColor = '#4f46e5';
  // Orange while calibration is in progress
  if (isCalibrating) bgColor = '#f59e0b';
  // Green once calibration has succeeded
  else if (hasBaseline) bgColor = '#10b981';

  return (
    <button
      // Run calibration when clicked
      onClick={triggerCalibration}
      // Disable the button while calibrating to prevent duplicate requests
      disabled={isCalibrating}
      // Inline styles controlling appearance and transitions
      style={{
        padding: '10px 20px', 
        borderRadius: '8px', 
        fontWeight: 'bold', 
        color: 'white',
        border: 'none', 
        // Show not-allowed cursor while calibrating, pointer otherwise
        cursor: isCalibrating ? 'not-allowed' : 'pointer',
        // Dynamic background color based on calibration state
        backgroundColor: bgColor, 
        // Smooth transition for all style changes
        transition: 'all 0.3s ease'
      }}
    >
      {/* Dynamic label: shows calibrating status, calibrated state, or default prompt */}
      {isCalibrating ? 'جاري لقط الملامح...' : hasBaseline ? 'Calibrated ✓' : 'Calibrate'}
    </button>
  );
}