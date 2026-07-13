// src/lib/FaceCalculations.js

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

// 🛠️ CONFIG: جميع الثوابت هنا لتسهيل الضبط
const CONFIG = {
  HEAD_PITCH_OFFSET: -0.15,
  EAR_THRESHOLD: 0.15,
  MOUTH_OPEN_MULT: 8.5,
  MOUTH_DEADZONE: 0.05,
  PUCKER_MULT: 16,
  PUCKER_SUPPRESS_MTH: 0.45,
  JOY_MULT: 40,
  SAD_MULT: 55,
  BROW_UP_MULT: 45,
  BROW_DOWN_MULT: 30,
  BROW_KNIT_MULT: 40,
  JOY_THRESHOLD: 0.003,
  SAD_THRESHOLD: -0.002
};

const get3DDist = (p1, p2) => Math.hypot((p1.x - p2.x), (p1.y - p2.y), (p1.z - p2.z));

const calculateEAR = (landmarks, indices) => {
  const v1 = get3DDist(landmarks[indices[1]], landmarks[indices[5]]);
  const v2 = get3DDist(landmarks[indices[2]], landmarks[indices[4]]);
  const h = get3DDist(landmarks[indices[0]], landmarks[indices[3]]);
  return (v1 + v2) / (2.0 * (h || 1));
};

export const processFaceMetrics = (landmarks, baseline = null, isCalibrating = false, onCalibrateComplete = null) => {
  if (!landmarks || landmarks.length === 0) return null;

  const dX_Cheeks = landmarks[LM.rightCheek].x - landmarks[LM.leftCheek].x;
  const dZ_Cheeks = landmarks[LM.rightCheek].z - landmarks[LM.leftCheek].z;
  const yawAngle = Math.atan2(dZ_Cheeks, dX_Cheeks);

  const dY_Pitch = landmarks[LM.noseTip].y - landmarks[LM.noseBridge].y;
  const dZ_Pitch = landmarks[LM.noseTip].z - landmarks[LM.noseBridge].z;
  const pitchAngle = Math.atan2(dZ_Pitch, dY_Pitch);

  const rollAngle = Math.atan2(landmarks[LM.rightCheek].y - landmarks[LM.leftCheek].y, dX_Cheeks);

  const faceWidth = get3DDist(landmarks[LM.leftCheek], landmarks[LM.rightCheek]);
  const faceHeight = get3DDist(landmarks[LM.forehead], landmarks[LM.chin]);
  
  const mouthH = get3DDist(landmarks[LM.mouth_InnerTop], landmarks[LM.mouth_InnerBot]) / faceHeight;
  const mouthW = get3DDist(landmarks[LM.mouth_CornerL], landmarks[LM.mouth_CornerR]) / faceWidth;

  const distCornerL_Chin = get3DDist(landmarks[LM.mouth_CornerL], landmarks[LM.chin]);
  const distCornerR_Chin = get3DDist(landmarks[LM.mouth_CornerR], landmarks[LM.chin]);
  const avgCornerChinDist = ((distCornerL_Chin + distCornerR_Chin) / 2) / faceHeight;

  const earL = calculateEAR(landmarks, LM.eyeL);
  const earR = calculateEAR(landmarks, LM.eyeR);
  const browL_Dist = get3DDist(landmarks[LM.browPeakL], landmarks[133]) / faceHeight;
  const browR_Dist = get3DDist(landmarks[LM.browPeakR], landmarks[362]) / faceHeight;
  const avgBrowDist = (browL_Dist + browR_Dist) / 2;
  const innerBrowDist = get3DDist(landmarks[LM.browInnerL], landmarks[LM.browInnerR]) / faceWidth;

  if (isCalibrating && onCalibrateComplete) {
    onCalibrateComplete({ 
      earL, earR, mouthH, mouthW, avgBrowDist,
      baseInnerBrow: innerBrowDist,
      baseCornerChin: avgCornerChinDist, 
      baseYaw: yawAngle, basePitch: pitchAngle, baseRoll: rollAngle
    });
    return null;
  }

  const base = baseline || {};
  const b_earL = base.earL ?? 0.3;
  const b_earR = base.earR ?? 0.3;
  const b_mouthH = base.mouthH ?? 0.015;
  const b_mouthW = base.mouthW ?? 0.35;
  const b_cornerChin = base.baseCornerChin ?? 0.35;
  const b_browDist = base.avgBrowDist ?? 0.16;
  const b_innerBrow = base.baseInnerBrow ?? 0.18;
  
  const finalYaw = yawAngle - (base.baseYaw ?? 0);
  const finalPitch = (pitchAngle - (base.basePitch ?? 0)) + CONFIG.HEAD_PITCH_OFFSET;
  const finalRoll = rollAngle - (base.baseRoll ?? 0);

  let blinkL = 1 - Math.max(0, Math.min(1, (earL - CONFIG.EAR_THRESHOLD) / (b_earL - CONFIG.EAR_THRESHOLD)));
  let blinkR = 1 - Math.max(0, Math.min(1, (earR - CONFIG.EAR_THRESHOLD) / (b_earR - CONFIG.EAR_THRESHOLD)));
  
  if (Math.abs(blinkL - blinkR) < 0.2) {
    const avg = (blinkL + blinkR) / 2; blinkL = avg; blinkR = avg;
  }

  const deltaBrow = avgBrowDist - b_browDist;
  const browUp = deltaBrow > 0 ? Math.min(1, deltaBrow * CONFIG.BROW_UP_MULT) : 0; 
  const browDown = deltaBrow < 0 ? Math.min(1, -deltaBrow * CONFIG.BROW_DOWN_MULT) : 0; 
  const deltaInner = b_innerBrow - innerBrowDist; 
  const browKnitted = deltaInner > 0 ? Math.min(1, deltaInner * CONFIG.BROW_KNIT_MULT) : 0;
  const browAngry = Math.min(1, browDown + browKnitted);

  let mouthA = Math.max(0, Math.min(1, (mouthH - b_mouthH) * CONFIG.MOUTH_OPEN_MULT));
  if (mouthA < CONFIG.MOUTH_DEADZONE) mouthA = 0;

  let pucker = 0;
  if (mouthW < b_mouthW - 0.005) {
    pucker = Math.max(0, Math.min(1, (b_mouthW - mouthW) * CONFIG.PUCKER_MULT));
  }

  let safeMouthA = mouthA;
  if (pucker > 0.1) {
    safeMouthA = Math.max(0, mouthA - (pucker * CONFIG.PUCKER_SUPPRESS_MTH)); 
  }
  
  const safePucker = pucker * (1 - (safeMouthA * 0.6));

  let joy = 0;
  let sad = 0;
  const deltaCornerChin = avgCornerChinDist - b_cornerChin;
  
  if (deltaCornerChin > CONFIG.JOY_THRESHOLD) {
    joy = Math.min(1, deltaCornerChin * CONFIG.JOY_MULT); 
  } else if (deltaCornerChin < CONFIG.SAD_THRESHOLD) {
    sad = Math.min(1, -deltaCornerChin * CONFIG.SAD_MULT);
  }

  const safeJoy = joy * (1 - (safeMouthA * 0.4)); 
  const safeSad = sad * (1 - (safeMouthA * 0.5));
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
    "Fcl_MTH_A": safeMouthA,
    "Fcl_MTH_U": safePucker,
    "Fcl_MTH_Neutral": neutralWeight,       
    "Fcl_MTH_Fun": safeJoy,                 
    "Fcl_MTH_Angry": Math.min(1, safeSad * 0.85),
    "Fcl_MTH_Sorrow": Math.min(1, safeSad * 1.2),
    mouth: safeMouthA,
    blink: (blinkL + blinkR) / 2
  };
};