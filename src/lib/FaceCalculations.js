// src/lib/FaceCalculations.js
//
// ⚡ ملاحظة معمارية مهمة: `landmarks` هلق Float32Array مسطّح (478 × 3 رقم)
// مش array of {x,y,z} objects متل قبل. اللاندماركس المفردة يلي فعلاً منستخدمها
// (عن طريق getPoint) بتتحول لـ object صغير وقت الحاجة بس — يعني بنخصص
// object جديد لـ ~20 نقطة فقط يلي منحسب عليها، مش كل الـ 478.

const LM = {
  eyeL: [33, 160, 158, 133, 153, 144],
  eyeR: [362, 385, 387, 263, 373, 380],
  eyeL_ref: 133,
  eyeR_ref: 362,
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
  browInnerR: 336,
};

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
  SAD_THRESHOLD: -0.002,
  EAR_ATTACK: 0.7, // استجابة سريعة جداً لما العين تسكر — يلتقط الرمشات السريعة كاملة
  EAR_RELEASE: 0.25, // استجابة أهدأ لما العين تفتح — يمنع الرعشة عند العتبة
  PITCH_COMPENSATION_CLAMP: 0.5,
};

// ⚡ استخراج نقطة واحدة من الـ Float32Array المسطّح
const getPoint = (landmarks, i) => ({
  x: landmarks[i * 3],
  y: landmarks[i * 3 + 1],
  z: landmarks[i * 3 + 2],
});

const get3DDist = (p1, p2) => {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dz = p1.z - p2.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

const calculateEAR = (landmarks, indices) => {
  const v1 = get3DDist(
    getPoint(landmarks, indices[1]),
    getPoint(landmarks, indices[5]),
  );
  const v2 = get3DDist(
    getPoint(landmarks, indices[2]),
    getPoint(landmarks, indices[4]),
  );
  const h = get3DDist(
    getPoint(landmarks, indices[0]),
    getPoint(landmarks, indices[3]),
  );
  return (v1 + v2) / (2.0 * (h || 1));
};

let smoothedEarL = null;
let smoothedEarR = null;

export const resetBlinkSmoothing = () => {
  smoothedEarL = null;
  smoothedEarR = null;
};

export const processFaceMetrics = (
  landmarks,
  baseline = null,
  isCalibrating = false,
  onCalibrateComplete = null,
) => {
  if (!landmarks || landmarks.length === 0) return null;

  const rightCheek = getPoint(landmarks, LM.rightCheek);
  const leftCheek = getPoint(landmarks, LM.leftCheek);
  const noseTip = getPoint(landmarks, LM.noseTip);
  const noseBridge = getPoint(landmarks, LM.noseBridge);
  const forehead = getPoint(landmarks, LM.forehead);
  const chin = getPoint(landmarks, LM.chin);
  const mouthCornerL = getPoint(landmarks, LM.mouth_CornerL);
  const mouthCornerR = getPoint(landmarks, LM.mouth_CornerR);
  const mouthInnerTop = getPoint(landmarks, LM.mouth_InnerTop);
  const mouthInnerBot = getPoint(landmarks, LM.mouth_InnerBot);
  const browPeakL = getPoint(landmarks, LM.browPeakL);
  const browPeakR = getPoint(landmarks, LM.browPeakR);
  const browInnerL = getPoint(landmarks, LM.browInnerL);
  const browInnerR = getPoint(landmarks, LM.browInnerR);
  const eyeL_ref = getPoint(landmarks, LM.eyeL_ref);
  const eyeR_ref = getPoint(landmarks, LM.eyeR_ref);

  const dX_Cheeks = rightCheek.x - leftCheek.x;
  const dZ_Cheeks = rightCheek.z - leftCheek.z;
  const yawAngle = Math.atan2(dZ_Cheeks, dX_Cheeks);

  const dY_Pitch = noseTip.y - noseBridge.y;
  const dZ_Pitch = noseTip.z - noseBridge.z;
  const pitchAngle = Math.atan2(dZ_Pitch, dY_Pitch);

  const rollAngle = Math.atan2(rightCheek.y - leftCheek.y, dX_Cheeks);

  const faceWidth = get3DDist(leftCheek, rightCheek);
  const faceHeight = get3DDist(forehead, chin);

  const mouthH = get3DDist(mouthInnerTop, mouthInnerBot) / faceHeight;
  const mouthW = get3DDist(mouthCornerL, mouthCornerR) / faceWidth;

  const distCornerL_Chin = get3DDist(mouthCornerL, chin);
  const distCornerR_Chin = get3DDist(mouthCornerR, chin);
  const avgCornerChinDist =
    (distCornerL_Chin + distCornerR_Chin) / 2 / faceHeight;

  const earL = calculateEAR(landmarks, LM.eyeL);
  const earR = calculateEAR(landmarks, LM.eyeR);
  const browL_Dist = get3DDist(browPeakL, eyeL_ref) / faceHeight;
  const browR_Dist = get3DDist(browPeakR, eyeR_ref) / faceHeight;
  const avgBrowDist = (browL_Dist + browR_Dist) / 2;
  const innerBrowDist = get3DDist(browInnerL, browInnerR) / faceWidth;

  if (isCalibrating && onCalibrateComplete) {
    resetBlinkSmoothing();
    onCalibrateComplete({
      earL,
      earR,
      mouthH,
      mouthW,
      avgBrowDist,
      baseInnerBrow: innerBrowDist,
      baseCornerChin: avgCornerChinDist,
      baseYaw: yawAngle,
      basePitch: pitchAngle,
      baseRoll: rollAngle,
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
  const finalPitch =
    pitchAngle - (base.basePitch ?? 0) + CONFIG.HEAD_PITCH_OFFSET;
  const finalRoll = rollAngle - (base.baseRoll ?? 0);

  const pitchCompensation =
    1 / Math.max(CONFIG.PITCH_COMPENSATION_CLAMP, Math.cos(pitchAngle));
  const earL_compensated = earL * pitchCompensation;
  const earR_compensated = earR * pitchCompensation;

  const alphaL =
    earL_compensated < smoothedEarL ? CONFIG.EAR_ATTACK : CONFIG.EAR_RELEASE;
  const alphaR =
    earR_compensated < smoothedEarR ? CONFIG.EAR_ATTACK : CONFIG.EAR_RELEASE;

  smoothedEarL =
    smoothedEarL === null
      ? earL_compensated
      : smoothedEarL + (earL_compensated - smoothedEarL) * alphaL;
  smoothedEarR =
    smoothedEarR === null
      ? earR_compensated
      : smoothedEarR + (earR_compensated - smoothedEarR) * alphaR;

  let blinkL =
    1 -
    Math.max(
      0,
      Math.min(
        1,
        (smoothedEarL - CONFIG.EAR_THRESHOLD) / (b_earL - CONFIG.EAR_THRESHOLD),
      ),
    );
  let blinkR =
    1 -
    Math.max(
      0,
      Math.min(
        1,
        (smoothedEarR - CONFIG.EAR_THRESHOLD) / (b_earR - CONFIG.EAR_THRESHOLD),
      ),
    );

  if (Math.abs(blinkL - blinkR) < 0.2) {
    const avg = (blinkL + blinkR) / 2;
    blinkL = avg;
    blinkR = avg;
  }

  const deltaBrow = avgBrowDist - b_browDist;
  const browUp =
    deltaBrow > 0 ? Math.min(1, deltaBrow * CONFIG.BROW_UP_MULT) : 0;
  const browDown =
    deltaBrow < 0 ? Math.min(1, -deltaBrow * CONFIG.BROW_DOWN_MULT) : 0;
  const deltaInner = b_innerBrow - innerBrowDist;
  const browKnitted =
    deltaInner > 0 ? Math.min(1, deltaInner * CONFIG.BROW_KNIT_MULT) : 0;
  const browAngry = Math.min(1, browDown + browKnitted);

  let mouthA = Math.max(
    0,
    Math.min(1, (mouthH - b_mouthH) * CONFIG.MOUTH_OPEN_MULT),
  );
  if (mouthA < CONFIG.MOUTH_DEADZONE) mouthA = 0;

  let pucker = 0;
  if (mouthW < b_mouthW - 0.005) {
    pucker = Math.max(0, Math.min(1, (b_mouthW - mouthW) * CONFIG.PUCKER_MULT));
  }

  let safeMouthA = mouthA;
  if (pucker > 0.1) {
    safeMouthA = Math.max(0, mouthA - pucker * CONFIG.PUCKER_SUPPRESS_MTH);
  }

  const safePucker = pucker * (1 - safeMouthA * 0.6);

  let joy = 0;
  let sad = 0;
  const deltaCornerChin = avgCornerChinDist - b_cornerChin;

  if (deltaCornerChin > CONFIG.JOY_THRESHOLD) {
    joy = Math.min(1, deltaCornerChin * CONFIG.JOY_MULT);
  } else if (deltaCornerChin < CONFIG.SAD_THRESHOLD) {
    sad = Math.min(1, -deltaCornerChin * CONFIG.SAD_MULT);
  }

  const safeJoy = joy * (1 - safeMouthA * 0.4);
  const safeSad = sad * (1 - safeMouthA * 0.5);
  const activeExpression = Math.max(safeMouthA, safePucker, safeJoy, safeSad);
  const neutralWeight = Math.max(0, 1 - activeExpression);

  return {
    yaw: finalYaw,
    pitch: finalPitch,
    roll: finalRoll,
    Fcl_EYE_Close_L: blinkL,
    Fcl_EYE_Close_R: blinkR,
    Fcl_BRW_Surprised: browUp,
    Fcl_BRW_Angry: browAngry,
    Fcl_MTH_A: safeMouthA,
    Fcl_MTH_U: safePucker,
    Fcl_MTH_Neutral: neutralWeight,
    Fcl_MTH_Fun: safeJoy,
    Fcl_MTH_Angry: Math.min(1, safeSad * 0.85),
    Fcl_MTH_Sorrow: Math.min(1, safeSad * 1.2),
    mouth: safeMouthA,
    blink: (blinkL + blinkR) / 2,
  };
};
