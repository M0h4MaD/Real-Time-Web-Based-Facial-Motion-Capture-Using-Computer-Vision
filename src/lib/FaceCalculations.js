/**
 * Central processor for face metrics.
 * Takes raw landmarks and returns a clean object with calculated ratios.
 */
export const processFaceMetrics = (landmarks) => {
  if (!landmarks) return null;

  return {
    yaw: calculateYawRotation(landmarks),
    mouth: calculateMouthOpenRatio(landmarks),
    blink: calculateEyeBlinkRatio(landmarks),
  };
};

/**
 * Calculates head Yaw rotation (turning left/right).
 * Normalized: 0 (Left), 0.5 (Center), 1 (Right).
 */
export const calculateYawRotation = (landmarks) => {
  const nose = landmarks[4].x;
  const leftCheek = landmarks[234].x;
  const rightCheek = landmarks[454].x;

  const faceWidth = rightCheek - leftCheek;
  const relativeNosePos = (nose - leftCheek) / faceWidth;

  return Math.min(Math.max(relativeNosePos, 0), 1);
};

/**
 * Calculates mouth open ratio.
 * 0 (Closed) to 1 (Open).
 */
export const calculateMouthOpenRatio = (landmarks) => {
  const upperLip = landmarks[13].y;
  const lowerLip = landmarks[14].y;
  
  const distance = Math.abs(upperLip - lowerLip);
  
  // Note: These values (0.01 - 0.06) are baseline. 
  // You may need to adjust them based on camera distance.
  const min = 0.01; 
  const max = 0.06;
  
  const ratio = (distance - min) / (max - min);
  return Math.min(Math.max(ratio, 0), 1);
};

/**
 * Calculates eye blink ratio.
 * 0 (Open) to 1 (Closed).
 */
export const calculateEyeBlinkRatio = (landmarks) => {
  const upperEyelid = landmarks[159].y;
  const lowerEyelid = landmarks[145].y;
  
  const distance = Math.abs(upperEyelid - lowerEyelid);
  
  // Note: Blink detection is sensitive to distance.
  const min = 0.005;
  const max = 0.02;
  
  const ratio = 1 - ((distance - min) / (max - min));
  return Math.min(Math.max(ratio, 0), 1);
};