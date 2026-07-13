import { create } from "zustand";
import { processFaceMetrics } from "./FaceCalculations";

// 🧠 نظام فلترة ذكي لمنع تداخل المحاور (Cross-talk) وتنعيم الحركة
let prevPitch = 0;
let prevYaw = 0;
let prevRoll = 0;

const applySmartFilter = (rawMetrics) => {
  if (!rawMetrics) return rawMetrics;

  const smoothFactor = 0.5; // (0.1 بطيء جداً وناعم - 0.9 سريع جداً وحاد)

  // ⚡ السر هنا: إذا كان دوران الرأس (Yaw) كبيراً، نقوم بتخدير استجابة الـ Pitch
  let pitchDamping = 1.0;
  if (rawMetrics.yaw !== undefined && Math.abs(rawMetrics.yaw) > 0.25) {
    pitchDamping = 0.15; // تخفيف حساسية الرفع والتنزيل أثناء الالتفاف
  }

  // نستخدم القيم الحالية أو القيم السابقة لتجنب ظهور NaN في حال عدم توفر قيمة من الحسابات
  const currentPitch =
    rawMetrics.pitch !== undefined ? rawMetrics.pitch : prevPitch;
  const currentYaw = rawMetrics.yaw !== undefined ? rawMetrics.yaw : prevYaw;
  const currentRoll =
    rawMetrics.roll !== undefined ? rawMetrics.roll : prevRoll;

  // تطبيق معادلة الـ EMA
  const finalPitch =
    prevPitch + (currentPitch - prevPitch) * (smoothFactor * pitchDamping);
  const finalYaw = prevYaw + (currentYaw - prevYaw) * smoothFactor;
  const finalRoll = prevRoll + (currentRoll - prevRoll) * smoothFactor;

  // حفظ القيم للإطار القادم
  prevPitch = finalPitch;
  prevYaw = finalYaw;
  prevRoll = finalRoll;

  return {
    ...rawMetrics,
    pitch: finalPitch,
    yaw: finalYaw,
    roll: finalRoll,
  };
};

// Tracking Global state store
export const useTrackingStore = create((set) => ({
  isTracking: false,
  toggleTracking: () => set((state) => ({ isTracking: !state.isTracking })),
}));

// Face Global state store
export const useFaceStore = create((set, get) => ({
  metrics: { yaw: 0, mouth: 0, blink: 0 },
  landmarks: [],
  calibrationBaseline: null,
  isCalibrating: false,

  triggerCalibration: () => set({ isCalibrating: true }),

  setLandmarks: (newLandmarks) => {
    if (!newLandmarks || newLandmarks.length === 0) return;
    const { calibrationBaseline, isCalibrating } = get();

    const newMetrics = processFaceMetrics(
      newLandmarks,
      calibrationBaseline,
      isCalibrating,
      (baselineData) => {
        set({ calibrationBaseline: baselineData, isCalibrating: false });
      },
    );

    if (newMetrics) {
      // ⚡ تمرير البيانات عبر الفلتر الذكي قبل اعتمادها في حالة التطبيق
      const filteredMetrics = applySmartFilter(newMetrics);
      set({ landmarks: newLandmarks, metrics: filteredMetrics });
    } else {
      set({ landmarks: newLandmarks });
    }
  },
}));

// UI Global state store
export const useUIStore = create((set) => ({
  appError: null,
  setAppError: (msg) => {
    set({ appError: msg });
    if (msg) setTimeout(() => set({ appError: null }), 5000);
  },

  isHUDVisible: true,
  toggleHUD: () => set((state) => ({ isHUDVisible: !state.isHUDVisible })),

  landmarkMode: "off",
  setLandmarkMode: (mode) => set({ landmarkMode: mode }),

  isMirrored: false,
  toggleMirror: () => set((state) => ({ isMirrored: !state.isMirrored })),

  isRecording: false,
  setIsRecording: (status) => set({ isRecording: status }),

  isGreenScreen: false,
  toggleGreenScreen: () =>
    set((state) => ({ isGreenScreen: !state.isGreenScreen })),

  modelUrl: "/Adam.glb",
  setModelUrl: (url) => set({ modelUrl: url }),

  modelBlendshapes: [],
  setModelBlendshapes: (shapes) => set({ modelBlendshapes: shapes }),
}));
