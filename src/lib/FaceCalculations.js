// FaceCalculations.js
const LM = {
  eyeL: [33, 160, 158, 133, 153, 144], 
  eyeR: [362, 385, 387, 263, 373, 380],
  mouth_CornerL: 61,
  mouth_CornerR: 291,
  mouth_InnerTop: 13,
  mouth_InnerBot: 14,
  mouth_Center: 0,
  noseTip: 4,
  noseBridge: 197,
  chin: 152,
  forehead: 10,
  leftCheek: 234,
  rightCheek: 454,
  browPeakL: 52,
  browPeakR: 282,
  browInnerL: 107,
  browInnerR: 336
};

// 🎥 Adjust the default head pitch to make Adam look directly at the screen when it first starts up
// If he is looking down too much, decrease the number (e.g., -0.10), and if he is looking up too much, increase it (e.g., -0.18)
const HEAD_PITCH_OFFSET = -0.15; 

// The function calculates the true 3D distance, so it is unaffected by head rotation
const get3DDist = (p1, p2) => Math.hypot((p1.x - p2.x), (p1.y - p2.y), (p1.z - p2.z)); // p1 and p2 are landmark points

// - Measures the true physical distance between facial landmarks, not just their apparent 2D screen distance
// - Remains stable regardless of head rotation, yaw, pitch, or roll
// - Enables reliable eye-blink detection (EAR) and other metrics even when the face is tilted
// - Critical for accurate calibration and real-time expression tracking

// Calculates Eye Aspect Ratio (EAR)
const calculateEAR = (landmarks, indices) => {
  const v1 = get3DDist(landmarks[indices[1]], landmarks[indices[5]]); // Vertical distance between upper and lower eyelid
  const v2 = get3DDist(landmarks[indices[2]], landmarks[indices[4]]); // Vertical distance between upper and lower eyelid
  const h = get3DDist(landmarks[indices[0]], landmarks[indices[3]]); // Horizontal distance between outer corners
  return (v1 + v2) / (2.0 * (h || 1)); // EAR calculation formula
};

// The main function that processes facial landmarks to calculate head orientation, expression metrics, and calibration data
export const processFaceMetrics = (landmarks, baseline = null, isCalibrating = false, onCalibrateComplete = null) => {
  if (!landmarks || landmarks.length === 0) return null; // Return null if no landmarks provided

  // 1. Calculates Face Orientation
  const dX_Cheeks = landmarks[LM.rightCheek].x - landmarks[LM.leftCheek].x; // Horizontal distance between cheeks
  const dZ_Cheeks = landmarks[LM.rightCheek].z - landmarks[LM.leftCheek].z; // Vertical distance between cheeks
  const yawAngle = Math.atan2(dZ_Cheeks, dX_Cheeks); // Yaw angle (left-right rotation)

  const dY_Pitch = landmarks[LM.noseTip].y - landmarks[LM.noseBridge].y; // Vertical distance between nose tip and bridge
  const dZ_Pitch = landmarks[LM.noseTip].z - landmarks[LM.noseBridge].z; // Distance along Z-axis for pitch calculation
  const pitchAngle = Math.atan2(dZ_Pitch, dY_Pitch); // Pitch angle (up-down rotation)

  const rollAngle = Math.atan2(landmarks[LM.rightCheek].y - landmarks[LM.leftCheek].y, dX_Cheeks); // Roll angle (tilt left-right)

  // 2. Face proportions (normalized dimensions)
  const faceWidth = get3DDist(landmarks[LM.leftCheek], landmarks[LM.rightCheek]); // Horizontal distance between cheeks
  const faceHeight = get3DDist(landmarks[LM.forehead], landmarks[LM.chin]); // Vertical distance between forehead and chin
  
  const mouthH = get3DDist(landmarks[LM.mouth_InnerTop], landmarks[LM.mouth_InnerBot]) / faceHeight; //  Mouth height ratio
  const mouthW = get3DDist(landmarks[LM.mouth_CornerL], landmarks[LM.mouth_CornerR]) / faceWidth; // Mouth width ratio

  // 3D Distances from mouth corners to chin
  const distCornerL_Chin = get3DDist(landmarks[LM.mouth_CornerL], landmarks[LM.chin]); // Distance from left mouth corner to chin
  const distCornerR_Chin = get3DDist(landmarks[LM.mouth_CornerR], landmarks[LM.chin]); // Distance from right mouth corner to chin
  const avgCornerChinDist = ((distCornerL_Chin + distCornerR_Chin) / 2) / faceHeight; // Average distance from mouth corners to chin

  // Eyes and eyebrows
  const earL = calculateEAR(landmarks, LM.eyeL);
  const earR = calculateEAR(landmarks, LM.eyeR);
  const browL_Dist = get3DDist(landmarks[LM.browPeakL], landmarks[133]) / faceHeight;
  const browR_Dist = get3DDist(landmarks[LM.browPeakR], landmarks[362]) / faceHeight;
  const avgBrowDist = (browL_Dist + browR_Dist) / 2;
  const innerBrowDist = get3DDist(landmarks[LM.browInnerL], landmarks[LM.browInnerR]) / faceWidth;

  // Calibrating System 🔴
  if (isCalibrating && onCalibrateComplete) {
    onCalibrateComplete({ 
      earL, earR, mouthH, mouthW, avgBrowDist,
      baseInnerBrow: innerBrowDist,
      baseCornerChin: avgCornerChinDist, 
      baseYaw: yawAngle, basePitch: pitchAngle, baseRoll: rollAngle
    });
    return null;
  }

  const base = baseline || {}; // base values
  const b_earL = base.earL ?? 0.3; // left eye aspect ratio
  const b_earR = base.earR ?? 0.3; // right eye aspect ratio
  const b_mouthH = base.mouthH ?? 0.015; // mouth height ratio
  const b_mouthW = base.mouthW ?? 0.35; // mouth width ratio
  const b_cornerChin = base.baseCornerChin ?? 0.35;  // average distance from mouth corners to chin
  const b_browDist = base.avgBrowDist ?? 0.16; // average eyebrow distance
  const b_innerBrow = base.baseInnerBrow ?? 0.18; // inner eyebrow distance
  
  const finalYaw = yawAngle - (base.baseYaw ?? 0); // yaw angle (left-right rotation)
  
  // Apply the default offset here to correct the gaze angle for the lower camera
  const finalPitch = (pitchAngle - (base.basePitch ?? 0)) + HEAD_PITCH_OFFSET;
  const finalRoll = rollAngle - (base.baseRoll ?? 0);

  // Eyes
  let blinkL = 1 - Math.max(0, Math.min(1, (earL - 0.15) / (b_earL - 0.15))); // L_Blink calculation
  let blinkR = 1 - Math.max(0, Math.min(1, (earR - 0.15) / (b_earR - 0.15))); // R_Blink calculation
  if (Math.abs(blinkL - blinkR) < 0.2) {
    const avg = (blinkL + blinkR) / 2; blinkL = avg; blinkR = avg; // Sync eye blinking when both eyes are similarly closed
  }

  // --- Eyebrows ---
  const deltaBrow = avgBrowDist - b_browDist;
  const browUp = deltaBrow > 0 ? Math.min(1, deltaBrow * 45) : 0; 
  const browDown = deltaBrow < 0 ? Math.min(1, -deltaBrow * 30) : 0; 
  const deltaInner = b_innerBrow - innerBrowDist; 
  const browKnitted = deltaInner > 0 ? Math.min(1, deltaInner * 40) : 0;
  const browAngry = Math.min(1, browDown + browKnitted);

  // Reduced multiplier to 8.5 to make mouth opening heavier and more realistic
  let mouthA = Math.max(0, Math.min(1, (mouthH - b_mouthH) * 8.5));
  if (mouthA < 0.05) mouthA = 0; // deadzone to prevent trembling and random mouth openings

  let pucker = 0;
  if (mouthW < b_mouthW - 0.005) {
    pucker = Math.max(0, Math.min(1, (b_mouthW - mouthW) * 16));
  }

  // 🔥 Motion isolation system (Anti-Crosstalk):
  // To prevent O and U mix-up: when you pucker (high Pucker), mouthA is automatically suppressed
  let safeMouthA = mouthA;
  if (pucker > 0.1) {
    safeMouthA = Math.max(0, mouthA - (pucker * 0.45)); 
  }
  
  // Conversely, if you open your mouth wide and clearly, pucker is reduced to avoid distortion
  const safePucker = pucker * (1 - (safeMouthA * 0.6));

  // --- Smiling and frowning (strengthened) ---
  let joy = 0;
  let sad = 0;
  const deltaCornerChin = avgCornerChinDist - b_cornerChin;
  
  if (deltaCornerChin > 0.003) {
    joy = Math.min(1, deltaCornerChin * 40); 
  } else if (deltaCornerChin < -0.002) { // Lowered threshold for faster frown response
    sad = Math.min(1, -deltaCornerChin * 55); // Increased multiplier to 55 to make frowning strong and visible
  }

  // Protecting shared surfaces using the new isolated values
  const safeJoy = joy * (1 - (safeMouthA * 0.4)); 
  const safeSad = sad * (1 - (safeMouthA * 0.5));

  // Calculating neutral state
  const activeExpression = Math.max(safeMouthA, safePucker, safeJoy, safeSad);
  const neutralWeight = Math.max(0, 1 - activeExpression);

  return {
    yaw: finalYaw, 
    pitch: finalPitch,
    roll: finalRoll,

    "Fcl_EYE_Close_L": blinkL,
    "Fcl_EYE_Close_R": blinkR,
    
    "Fcl_BRW_Surprised": browUp,
    "Fcl_BRW_Angry": browAngry, 
    
    "Fcl_MTH_A": safeMouthA, // Clean open mouth (O) after isolation
    "Fcl_MTH_U": safePucker, // Clean puckered mouth (U) after isolation   
    
    "Fcl_MTH_Neutral": neutralWeight,       
    "Fcl_MTH_Fun": safeJoy,                 
    "Fcl_MTH_Angry": Math.min(1, safeSad * 0.85), // Supported and strong frown
    "Fcl_MTH_Sorrow": Math.min(1, safeSad * 1.2),  // Deep and clear sorrow
    
    mouth: safeMouthA,
    blink: (blinkL + blinkR) / 2
  };
};