// خريطة النقاط الاحترافية (478 نقطة)
const LM = {
  eyeL: [33, 160, 158, 133, 153, 144], 
  eyeR: [362, 385, 387, 263, 373, 380],
  irisL: 468, irisR: 473,
  mouth_CornerL: 61, mouth_CornerR: 291,
  mouth_TopLip: 0, mouth_BottomLip: 17,
  noseTip: 4, chin: 152, forehead: 10,
  leftCheek: 234, rightCheek: 454,
  browL: 105, browR: 334
};

// حساب المسافة ثلاثية الأبعاد
const get3DDist = (p1, p2) => Math.hypot((p1.x - p2.x), (p1.y - p2.y), (p1.z - p2.z));

// خوارزمية EAR الدقيقة للرمش
const calculateEAR = (landmarks, indices) => {
  const v1 = get3DDist(landmarks[indices[1]], landmarks[indices[5]]);
  const v2 = get3DDist(landmarks[indices[2]], landmarks[indices[4]]);
  const h = get3DDist(landmarks[indices[0]], landmarks[indices[3]]);
  return (v1 + v2) / (2.0 * (h || 1));
};

export const processFaceMetrics = (landmarks, baseline = null, isCalibrating = false, onCalibrateComplete = null) => {
  if (!landmarks || landmarks.length === 0) return null;

  // 1. حساب زوايا الرأس الحقيقية (3D Euler Angles) باستخدام العمق Z
  // حساب Yaw (الالتفات يمين/يسار)
  const dX_Cheeks = landmarks[LM.rightCheek].x - landmarks[LM.leftCheek].x;
  const dZ_Cheeks = landmarks[LM.rightCheek].z - landmarks[LM.leftCheek].z;
  const yawAngle = Math.atan2(dZ_Cheeks, dX_Cheeks); 

  // حساب Pitch (النظر للأعلى/الأسفل)
  const dY_Face = landmarks[LM.chin].y - landmarks[LM.forehead].y;
  const dZ_Face = landmarks[LM.chin].z - landmarks[LM.forehead].z;
  const pitchAngle = Math.atan2(dZ_Face, dY_Face);

  // حساب Roll (ميلان الرأس للكتف)
  const rollAngle = Math.atan2(landmarks[LM.rightCheek].y - landmarks[LM.leftCheek].y, dX_Cheeks);

  // 2. تتبع البؤبؤ (Iris) بدقة متناهية بالنسبة لزوايا العين
  const eyeWidthL = get3DDist(landmarks[133], landmarks[33]);
  const irisDistX_L = landmarks[LM.irisL].x - landmarks[133].x;
  const irisDistY_L = landmarks[LM.irisL].y - landmarks[159].y;
  const gazeL = { x: (irisDistX_L / eyeWidthL) - 0.5, y: irisDistY_L * 15 };

  const eyeWidthR = get3DDist(landmarks[263], landmarks[362]);
  const irisDistX_R = landmarks[LM.irisR].x - landmarks[362].x;
  const irisDistY_R = landmarks[LM.irisR].y - landmarks[386].y;
  const gazeR = { x: (irisDistX_R / eyeWidthR) - 0.5, y: irisDistY_R * 15 };

  // 3. عزل الفم لمنع الـ Shifting
  const faceWidth = get3DDist(landmarks[LM.leftCheek], landmarks[LM.rightCheek]);
  const jawOpenDist = get3DDist(landmarks[LM.mouth_TopLip], landmarks[LM.mouth_BottomLip]) / faceWidth;
  
  // الابتسامة تقاس بالمسافة الأفقية المباشرة (X-axis distance) لمنع تداخلها مع فتح الفك السفلي
  const smileWidthL = Math.abs(landmarks[LM.mouth_CornerL].x - landmarks[LM.noseTip].x) / faceWidth;
  const smileWidthR = Math.abs(landmarks[LM.mouth_CornerR].x - landmarks[LM.noseTip].x) / faceWidth;

  const earL = calculateEAR(landmarks, LM.eyeL);
  const earR = calculateEAR(landmarks, LM.eyeR);
  const browUpLDist = Math.abs(landmarks[LM.browL].y - landmarks[159].y) / faceWidth;
  const browUpRDist = Math.abs(landmarks[LM.browR].y - landmarks[386].y) / faceWidth;

  if (isCalibrating && onCalibrateComplete) {
    onCalibrateComplete({ 
      earL, earR, jawOpenDist, smileWidthL, smileWidthR, browUpLDist, browUpRDist,
      basePitch: pitchAngle 
    });
    return null;
  }

  const base = baseline || { 
    earL: 0.3, earR: 0.3, jawOpenDist: 0.02, smileWidthL: 0.15, smileWidthR: 0.15, 
    browUpLDist: 0.1, browUpRDist: 0.1, basePitch: 0 
  };

  // العيون (فلتر ذكي للرمش)
  let blinkL = 1 - Math.max(0, Math.min(1, (earL - 0.15) / (base.earL - 0.15)));
  let blinkR = 1 - Math.max(0, Math.min(1, (earR - 0.15) / (base.earR - 0.15)));
  if (Math.abs(blinkL - blinkR) < 0.2) {
    const avg = (blinkL + blinkR) / 2; blinkL = avg; blinkR = avg;
  }

  // الفم (صافي، بدون تداخل)
  const mouthA = Math.max(0, Math.min(1, (jawOpenDist - base.jawOpenDist) * 12));
  const smileL = Math.max(0, Math.min(1, (smileWidthL - base.smileWidthL) * 15));
  const smileR = Math.max(0, Math.min(1, (smileWidthR - base.smileWidthR) * 15));
  
  // الحواجب
  const browL = Math.max(0, Math.min(1, (browUpLDist - base.browUpLDist) * 20));
  const browR = Math.max(0, Math.min(1, (browUpRDist - base.browUpRDist) * 20));

  return {
    // زوايا حقيقية 100% 
    yaw: yawAngle, 
    pitch: pitchAngle - base.basePitch, // تعديل الـ Pitch بناءً على وضعية جلوسك
    roll: rollAngle,
    
    gaze: { l: gazeL, r: gazeR },

    // مفاتيح VRoid
    "Fcl_EYE_Close_L": blinkL,
    "Fcl_EYE_Close_R": blinkR,
    "Fcl_BRW_Up_L": browL,
    "Fcl_BRW_Up_R": browR,
    "Fcl_MTH_A": mouthA,
    "Fcl_MTH_Up_L": smileL,
    "Fcl_MTH_Up_R": smileR,
    "Fcl_MTH_SkinFung_L": smileL,
    "Fcl_MTH_SkinFung_R": smileR,
    
    // قيم الـ HUD القديمة
    mouth: mouthA,
    blink: (blinkL + blinkR) / 2
  };
};