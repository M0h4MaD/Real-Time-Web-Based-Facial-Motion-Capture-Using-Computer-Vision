// FaceCalculations.js
const LM = {
  eyeL: [33, 160, 158, 133, 153, 144], 
  eyeR: [362, 385, 387, 263, 373, 380],
  mouth_CornerL: 61,   // الزاوية اليسارية
  mouth_CornerR: 291,  // الزاوية اليمينية
  mouth_InnerTop: 13,  // منتصف الشفة العليا الداخلي
  mouth_InnerBot: 14,  // منتصف الشفة السفلى الداخلي
  mouth_Center: 0,     // مركز الشفاه (مغلقة)
  noseTip: 4, 
  noseBridge: 197, 
  chin: 152,           // الذقن - النقطة المرجعية الجديدة الثابتة
  forehead: 10,
  leftCheek: 234, 
  rightCheek: 454,
  browPeakL: 52,
  browPeakR: 282,
  browInnerL: 107,
  browInnerR: 336
};

// الدالة هاي بتحسب المسافة الحقيقية بالفراغ 3D، فما بتتأثر بدوران الرأس أبداً
const get3DDist = (p1, p2) => Math.hypot((p1.x - p2.x), (p1.y - p2.y), (p1.z - p2.z));

const calculateEAR = (landmarks, indices) => {
  const v1 = get3DDist(landmarks[indices[1]], landmarks[indices[5]]);
  const v2 = get3DDist(landmarks[indices[2]], landmarks[indices[4]]);
  const h = get3DDist(landmarks[indices[0]], landmarks[indices[3]]);
  return (v1 + v2) / (2.0 * (h || 1));
};

export const processFaceMetrics = (landmarks, baseline = null, isCalibrating = false, onCalibrateComplete = null) => {
  if (!landmarks || landmarks.length === 0) return null;

  // 1. حساب زوايا الرأس 
  const dX_Cheeks = landmarks[LM.rightCheek].x - landmarks[LM.leftCheek].x;
  const dZ_Cheeks = landmarks[LM.rightCheek].z - landmarks[LM.leftCheek].z;
  const yawAngle = Math.atan2(dZ_Cheeks, dX_Cheeks); 

  const dY_Pitch = landmarks[LM.noseTip].y - landmarks[LM.noseBridge].y;
  const dZ_Pitch = landmarks[LM.noseTip].z - landmarks[LM.noseBridge].z;
  const pitchAngle = Math.atan2(dZ_Pitch, dY_Pitch);

  const rollAngle = Math.atan2(landmarks[LM.rightCheek].y - landmarks[LM.leftCheek].y, dX_Cheeks);

  // 2. مقاييس الوجه الأساسية (المسافات ثلاثية الأبعاد)
  const faceWidth = get3DDist(landmarks[LM.leftCheek], landmarks[LM.rightCheek]);
  const faceHeight = get3DDist(landmarks[LM.forehead], landmarks[LM.chin]);
  
  const mouthH = get3DDist(landmarks[LM.mouth_InnerTop], landmarks[LM.mouth_InnerBot]) / faceHeight;
  const mouthW = get3DDist(landmarks[LM.mouth_CornerL], landmarks[LM.mouth_CornerR]) / faceWidth;

  // 🔥 الحل الجذري: قياس المسافة الفراغية بين زوايا الفم والذقن
  // لما تبتسم: الزوايا بتطلع لفوق وبتبعد عن الذقن. لما تحزن: الزوايا بتنزل وبتقرب من الذقن.
  const distCornerL_Chin = get3DDist(landmarks[LM.mouth_CornerL], landmarks[LM.chin]);
  const distCornerR_Chin = get3DDist(landmarks[LM.mouth_CornerR], landmarks[LM.chin]);
  const avgCornerChinDist = ((distCornerL_Chin + distCornerR_Chin) / 2) / faceHeight;

  // العيون والحواجب
  const earL = calculateEAR(landmarks, LM.eyeL);
  const earR = calculateEAR(landmarks, LM.eyeR);
  const browL_Dist = get3DDist(landmarks[LM.browPeakL], landmarks[133]) / faceHeight;
  const browR_Dist = get3DDist(landmarks[LM.browPeakR], landmarks[362]) / faceHeight;
  const avgBrowDist = (browL_Dist + browR_Dist) / 2;
  const innerBrowDist = get3DDist(landmarks[LM.browInnerL], landmarks[LM.browInnerR]) / faceWidth;

  // 🔴 نظام المعايرة 
  if (isCalibrating && onCalibrateComplete) {
    onCalibrateComplete({ 
      earL, earR, mouthH, mouthW, avgBrowDist,
      baseInnerBrow: innerBrowDist,
      baseCornerChin: avgCornerChinDist, // حفظ المسافة الطبيعية بين الزوايا والذقن
      baseYaw: yawAngle, basePitch: pitchAngle, baseRoll: rollAngle
    });
    return null;
  }

  const base = baseline || {};
  const b_earL = base.earL ?? 0.3;
  const b_earR = base.earR ?? 0.3;
  const b_mouthH = base.mouthH ?? 0.015;
  const b_mouthW = base.mouthW ?? 0.35;
  const b_cornerChin = base.baseCornerChin ?? 0.35; // القيمة المرجعية
  const b_browDist = base.avgBrowDist ?? 0.16;
  const b_innerBrow = base.baseInnerBrow ?? 0.18;
  
  const finalYaw = yawAngle - (base.baseYaw ?? 0);
  const finalPitch = pitchAngle - (base.basePitch ?? 0);
  const finalRoll = rollAngle - (base.baseRoll ?? 0);

  // --- العيون ---
  let blinkL = 1 - Math.max(0, Math.min(1, (earL - 0.15) / (b_earL - 0.15)));
  let blinkR = 1 - Math.max(0, Math.min(1, (earR - 0.15) / (b_earR - 0.15)));
  if (Math.abs(blinkL - blinkR) < 0.2) {
    const avg = (blinkL + blinkR) / 2; blinkL = avg; blinkR = avg;
  }

  // --- الحواجب ---
  const deltaBrow = avgBrowDist - b_browDist;
  const browUp = deltaBrow > 0 ? Math.min(1, deltaBrow * 45) : 0; 
  const browDown = deltaBrow < 0 ? Math.min(1, -deltaBrow * 30) : 0; 
  const deltaInner = b_innerBrow - innerBrowDist; 
  const browKnitted = deltaInner > 0 ? Math.min(1, deltaInner * 40) : 0;
  const browAngry = Math.min(1, browDown + browKnitted);

  // --- الفم (الأساسي) ---
  let mouthA = Math.max(0, Math.min(1, (mouthH - b_mouthH) * 14));
  if (mouthA < 0.04) mouthA = 0; 

  let pucker = 0;
  if (mouthW < b_mouthW - 0.005) {
    pucker = Math.max(0, Math.min(1, (b_mouthW - mouthW) * 15));
  }

  // --- الابتسامة والحزن (معتمد على المسافة 3D فقط) ---
  let joy = 0;
  let sorrow = 0;
  const deltaCornerChin = avgCornerChinDist - b_cornerChin;
  
  // إذا كبرت المسافة بين الزوايا والذقن (الزوايا ارتفعت) = ابتسامة
  if (deltaCornerChin > 0.003) {
    joy = Math.min(1, deltaCornerChin * 40); 
  } 
  // إذا صغرت المسافة (الزوايا نزلت لتحت) = حزن
  else if (deltaCornerChin < -0.003) {
    sorrow = Math.min(1, -deltaCornerChin * 40);
  }

  // حماية (Anti-Stacking) لحماية المودل من التشوه عند فتح الفم
  const safeJoy = joy * (1 - (mouthA * 0.4)); 
  const safeSorrow = sorrow * (1 - (mouthA * 0.6));
  const safePucker = pucker * (1 - (mouthA * 0.8));

  return {
    yaw: finalYaw, 
    pitch: finalPitch,
    roll: finalRoll,

    "Fcl_EYE_Close_L": blinkL,
    "Fcl_EYE_Close_R": blinkR,
    
    "Fcl_BRW_Surprised": browUp,
    "Fcl_BRW_Angry": browAngry, 
    
    "Fcl_MTH_A": mouthA,
    "Fcl_MTH_U": safePucker,    
    
    // تم حذف مفاتيح Up/Down واستخدام المفاتيح الصحيحة فقط
    "Fcl_MTH_Fun": safeJoy, 
    "Fcl_MTH_Sorrow": safeSorrow,
    
    mouth: mouthA,
    blink: (blinkL + blinkR) / 2
  };
}; // Another good