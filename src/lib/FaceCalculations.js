// File: src/lib/FaceCalculations.js
//
// Important architectural note: `landmarks` is now a flat Float32Array (478 x 3 numbers)
// instead of an array of {x,y,z} objects. Individual points used in calculations
// are converted to small objects on demand via getPoint, so we only allocate
// ~20 point objects per frame instead of all 478.

// Landmark index constants for key facial features
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

// Tunable configuration values for metric calculations
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
  EAR_ATTACK: 0.7,
  EAR_RELEASE: 0.25,
  PITCH_COMPENSATION_CLAMP: 0.5,
};

// Extract a single point {x,y,z} from the flat Float32Array
const getPoint = (landmarks, i) => ({
  x: landmarks[i * 3],
  y: landmarks[i * 3 + 1],
  z: landmarks[i * 3 + 2],
});

// Compute the 3D Euclidean distance between two points
const get3DDist = (p1, p2) => {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dz = p1.z - p2.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

// Compute the Eye Aspect Ratio (EAR) from six eye landmark indices
const calculateEAR = (landmarks, indices) => {
  const v1 = get3DDist(getPoint(landmarks, indices[1]), getPoint(landmarks, indices[5]));
  const v2 = get3DDist(getPoint(landmarks, indices[2]), getPoint(landmarks, indices[4]));
  const h = get3DDist(getPoint(landmarks, indices[0]), getPoint(landmarks, indices[3]));
  return (v1 + v2) / (2.0 * (h || 1));
};

// Module-level smoothed EAR values (left and right)
let smoothedEarL = null;
let smoothedEarR = null;

// Reset the blink smoothing state
export const resetBlinkSmoothing = () => {
  smoothedEarL = null;
  smoothedEarR = null;
};

// Main entry: convert raw landmarks into a metrics object
export const processFaceMetrics = (
  landmarks,
  baseline = null,
  isCalibrating = false,
  onCalibrateComplete = null,
) => {
  // Bail if there are no landmarks
  if (!landmarks || landmarks.length === 0) return null;

  // Extract key facial points from the flat landmark array
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

  // Calculate head rotation angles from facial geometry
  const dX_Cheeks = rightCheek.x - leftCheek.x;
  const dZ_Cheeks = rightCheek.z - leftCheek.z;
  const yawAngle = Math.atan2(dZ_Cheeks, dX_Cheeks);

  const dY_Pitch = noseTip.y - noseBridge.y;
  const dZ_Pitch = noseTip.z - noseBridge.z;
  const pitchAngle = Math.atan2(dZ_Pitch, dY_Pitch);

  const rollAngle = Math.atan2(rightCheek.y - leftCheek.y, dX_Cheeks);

  // Calculate face width and height for normalization
  const faceWidth = get3DDist(leftCheek, rightCheek);
  const faceHeight = get3DDist(forehead, chin);

  // Normalized mouth dimensions
  const mouthH = get3DDist(mouthInnerTop, mouthInnerBot) / faceHeight;
  const mouthW = get3DDist(mouthCornerL, mouthCornerR) / faceWidth;

  // Average mouth-corner-to-chin distance (normalized)
  const distCornerL_Chin = get3DDist(mouthCornerL, chin);
  const distCornerR_Chin = get3DDist(mouthCornerR, chin);
  const avgCornerChinDist =
    (distCornerL_Chin + distCornerR_Chin) / 2 / faceHeight;

  // Eye aspect ratios for blink detection
  const earL = calculateEAR(landmarks, LM.eyeL);
  const earR = calculateEAR(landmarks, LM.eyeR);
  // Normalized brow distances
  const browL_Dist = get3DDist(browPeakL, eyeL_ref) / faceHeight;
  const browR_Dist = get3DDist(browPeakR, eyeR_ref) / faceHeight;
  const avgBrowDist = (browL_Dist + browR_Dist) / 2;
  const innerBrowDist = get3DDist(browInnerL, browInnerR) / faceWidth;

  // If calibrating, capture the baseline and return nothing
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

  // Use the provided baseline or sensible defaults
  const base = baseline || {};
  const b_earL = base.earL ?? 0.3;
  const b_earR = base.earR ?? 0.3;
  const b_mouthH = base.mouthH ?? 0.015;
  const b_mouthW = base.mouthW ?? 0.35;
  const b_cornerChin = base.baseCornerChin ?? 0.35;
  const b_browDist = base.avgBrowDist ?? 0.16;
  const b_innerBrow = base.baseInnerBrow ?? 0.18;

  // Subtract the baseline from the head rotations
  const finalYaw = yawAngle - (base.baseYaw ?? 0);
  const finalPitch =
    pitchAngle - (base.basePitch ?? 0) + CONFIG.HEAD_PITCH_OFFSET;
  const finalRoll = rollAngle - (base.baseRoll ?? 0);

  // Compensate EAR for pitch (face tilt toward camera)
  const pitchCompensation =
    1 / Math.max(CONFIG.PITCH_COMPENSATION_CLAMP, Math.cos(pitchAngle));
  const earL_compensated = earL * pitchCompensation;
  const earR_compensated = earR * pitchCompensation;

  // Choose attack/release alpha based on whether the eye is closing
  const alphaL =
    earL_compensated < smoothedEarL ? CONFIG.EAR_ATTACK : CONFIG.EAR_RELEASE;
  const alphaR =
    earR_compensated < smoothedEarR ? CONFIG.EAR_ATTACK : CONFIG.EAR_RELEASE;

  // Smooth the left EAR (init on first frame, else exponential smoothing)
  smoothedEarL =
    smoothedEarL === null
      ? earL_compensated
      : smoothedEarL + (earL_compensated - smoothedEarL) * alphaL;
  // Smooth the right EAR
  smoothedEarR =
    smoothedEarR === null
      ? earR_compensated
      : smoothedEarR + (earR_compensated - smoothedEarR) * alphaR;

  // Convert smoothed EAR into a 0..1 blink value (1 = closed)
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

  // Average the blink values if they are close
  if (Math.abs(blinkL - blinkR) < 0.2) {
    const avg = (blinkL + blinkR) / 2;
    blinkL = avg;
    blinkR = avg;
  }

  // Brow expressions relative to baseline
  const deltaBrow = avgBrowDist - b_browDist;
  const browUp =
    deltaBrow > 0 ? Math.min(1, deltaBrow * CONFIG.BROW_UP_MULT) : 0;
  const browDown =
    deltaBrow < 0 ? Math.min(1, -deltaBrow * CONFIG.BROW_DOWN_MULT) : 0;
  const deltaInner = b_innerBrow - innerBrowDist;
  const browKnitted =
    deltaInner > 0 ? Math.min(1, deltaInner * CONFIG.BROW_KNIT_MULT) : 0;
  const browAngry = Math.min(1, browDown + browKnitted);

  // Mouth open amount relative to baseline
  let mouthA = Math.max(
    0,
    Math.min(1, (mouthH - b_mouthH) * CONFIG.MOUTH_OPEN_MULT),
  );
  // Kill tiny mouth movement within the deadzone
  if (mouthA < CONFIG.MOUTH_DEADZONE) mouthA = 0;

  // Pucker amount (mouth narrower than baseline)
  let pucker = 0;
  if (mouthW < b_mouthW - 0.005) {
    pucker = Math.max(0, Math.min(1, (b_mouthW - mouthW) * CONFIG.PUCKER_MULT));
  }

  // Suppress mouth-open when puckering
  let safeMouthA = mouthA;
  if (pucker > 0.1) {
    safeMouthA = Math.max(0, mouthA - pucker * CONFIG.PUCKER_SUPPRESS_MTH);
  }

  // Scale pucker down by mouth-open
  const safePucker = pucker * (1 - safeMouthA * 0.6);

  // Joy/sad from corner-chin distance delta
  let joy = 0;
  let sad = 0;
  const deltaCornerChin = avgCornerChinDist - b_cornerChin;

  if (deltaCornerChin > CONFIG.JOY_THRESHOLD) {
    joy = Math.min(1, deltaCornerChin * CONFIG.JOY_MULT);
  } else if (deltaCornerChin < CONFIG.SAD_THRESHOLD) {
    sad = Math.min(1, -deltaCornerChin * CONFIG.SAD_MULT);
  }

  // Scale joy/sad by mouth-open
  const safeJoy = joy * (1 - safeMouthA * 0.4);
  const safeSad = sad * (1 - safeMouthA * 0.5);
  // Combined active expression strength
  const activeExpression = Math.max(safeMouthA, safePucker, safeJoy, safeSad);
  // Neutral weight is the complement
  const neutralWeight = Math.max(0, 1 - activeExpression);

  // Return the full metrics object
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