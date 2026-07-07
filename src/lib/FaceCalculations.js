/**
 * Central processor for face metrics.
 * Takes raw landmarks and returns a clean object with calculated ratios.
 */
// نقاط الدلالة (Landmarks) الأساسية في MediaPipe
const LM = {
  eyeL_Top: 159, eyeL_Bottom: 145, eyeL_Left: 33, eyeL_Right: 133,
  eyeR_Top: 386, eyeR_Bottom: 374, eyeR_Left: 362, eyeR_Right: 263,
  mouth_TopLip: 13, mouth_BottomLip: 14,
  mouth_CornerL: 61, mouth_CornerR: 291,
  browL: 105, browR: 334
};

const getDistance = (p1, p2) => {
  if (!p1 || !p2) return 0;
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2) + Math.pow(p1.z - p2.z, 2));
};

export const processFaceMetrics = (landmarks) => {
  if (!landmarks || landmarks.length === 0) return null;

  // --- 1. حساب Yaw (بالطريقة اللي كانت شغالة عندك) ---
  const nose = landmarks[4].x;
  const leftCheek = landmarks[234].x;
  const rightCheek = landmarks[454].x;
  const faceWidth = rightCheek - leftCheek;
  const yaw = Math.min(Math.max((nose - leftCheek) / faceWidth, 0), 1);

  // --- 2. حسابات الـ Mocap الدقيقة ---
  // العيون
  const eyeL_Vert = getDistance(landmarks[LM.eyeL_Top], landmarks[LM.eyeL_Bottom]);
  const eyeL_Horiz = getDistance(landmarks[LM.eyeL_Left], landmarks[LM.eyeL_Right]);
  const eyeR_Vert = getDistance(landmarks[LM.eyeR_Top], landmarks[LM.eyeR_Bottom]);
  const eyeR_Horiz = getDistance(landmarks[LM.eyeR_Left], landmarks[LM.eyeR_Right]);
  
  const eyeL_Ratio = eyeL_Vert / (eyeL_Horiz || 1);
  const eyeR_Ratio = eyeR_Vert / (eyeR_Horiz || 1);

  const blinkL = Math.max(0, Math.min(1, (0.32 - eyeL_Ratio) / (0.32 - 0.14)));
  const blinkR = Math.max(0, Math.min(1, (0.32 - eyeR_Ratio) / (0.32 - 0.14)));
  const isSurprisedEye = Math.max(0, Math.min(1, (eyeL_Ratio - 0.32) / 0.15));

  // الفم
  const mouth_OpenVert = getDistance(landmarks[LM.mouth_TopLip], landmarks[LM.mouth_BottomLip]);
  const mouth_Width = getDistance(landmarks[LM.mouth_CornerL], landmarks[LM.mouth_CornerR]);
  
  const mouthA = Math.max(0, Math.min(1, (mouth_OpenVert - 0.01) / 0.07));
  const mouthO = Math.max(0, Math.min(1, (mouth_OpenVert / (mouth_Width || 1)) * 0.5));

  // زوايا الفم (الابتسامة والعبوس)
  const midLipY = (landmarks[LM.mouth_TopLip].y + landmarks[LM.mouth_BottomLip].y) / 2;
  const averageCornerY = (landmarks[LM.mouth_CornerL].y + landmarks[LM.mouth_CornerR].y) / 2;
  const mouthDeltaY = midLipY - averageCornerY; 
  
  const mouthUp = Math.max(0, Math.min(1, mouthDeltaY * 15));
  const mouthDown = Math.max(0, Math.min(1, -mouthDeltaY * 15));

  // --- 3. إرجاع كائن (Object) يرضي جميع الأطراف ---
  return {
    // 🟢 القيم القديمة عشان الـ HUD يضل شغال وما يضرب:
    yaw: yaw,
    mouth: mouthA, 
    blink: (blinkL + blinkR) / 2, // متوسط رمشة العينين للـ HUD

    // 🔵 القيم الجديدة عشان المودل (آدم) يقلد حركتك الحقيقية:
    "Fcl_EYE_Close_L": blinkL,
    "Fcl_EYE_Close_R": blinkR,
    "Fcl_EYE_Spread": isSurprisedEye,
    "Fcl_MTH_A": mouthA,
    "Fcl_MTH_O": mouthO,
    "Fcl_MTH_Up": mouthUp,
    "Fcl_MTH_Down": mouthDown,
    "Fcl_EYE_Joy_L": mouthUp * 0.7, // العين تضحك مع الفم
    "Fcl_EYE_Joy_R": mouthUp * 0.7,
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