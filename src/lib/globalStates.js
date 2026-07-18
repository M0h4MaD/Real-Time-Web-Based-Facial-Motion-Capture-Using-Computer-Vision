// src/lib/globalStates.js
import { create } from "zustand";
import { processFaceMetrics } from "./FaceCalculations";
import toast from "react-hot-toast";

// ⚡ نظام فلترة ذكي لمنع تداخل المحاور (Cross-talk) وتنعيم الحركة
// التعديل الأهم: التنعيم صار مستقل عن الـ FPS (delta-time corrected).
// قبل، smoothFactor=0.5 كان يتطبق "مرة كل استدعاء" بغض النظر عن الوقت
// الفعلي بين الاستدعاءات — فلو المستخدم غيّر Tracking FPS من 30 لـ 15،
// نفس الرقم كان يعطي إحساس حركة مختلف تماماً. هلق منحسب الوقت الفعلي
// (performance.now) ومنصحح عامل التنعيم حسبه، فالإحساس بالحركة ثابت
// بغض النظر عن الـ FPS المختار.
let prevPitch = 0;
let prevYaw = 0;
let prevRoll = 0;
let prevFilterTime = null;

const SMOOTH_FACTOR_BASE = 0.5;
const REFERENCE_INTERVAL_MS = 1000 / 30; // مرجع 30fps (نفس القيمة الافتراضية لـ trackingFPS)
const MAX_TIME_SCALE = 5; // حماية من قفزة ضخمة لو التبويب كان بالخلفية لفترة

const applySmartFilter = (rawMetrics) => {
  if (!rawMetrics) return rawMetrics;

  const now = performance.now();
  const dt =
    prevFilterTime === null ? REFERENCE_INTERVAL_MS : now - prevFilterTime;
  prevFilterTime = now;

  const timeScale = Math.min(MAX_TIME_SCALE, dt / REFERENCE_INTERVAL_MS);
  const smoothFactor = 1 - Math.pow(1 - SMOOTH_FACTOR_BASE, timeScale);

  let pitchDamping = 1.0;

  if (rawMetrics.yaw !== undefined && Math.abs(rawMetrics.yaw) > 0.25) {
    pitchDamping = 0.15;
  }

  const currentPitch =
    rawMetrics.pitch !== undefined ? rawMetrics.pitch : prevPitch;
  const currentYaw = rawMetrics.yaw !== undefined ? rawMetrics.yaw : prevYaw;
  const currentRoll =
    rawMetrics.roll !== undefined ? rawMetrics.roll : prevRoll;

  const finalPitch =
    prevPitch + (currentPitch - prevPitch) * (smoothFactor * pitchDamping);
  const finalYaw = prevYaw + (currentYaw - prevYaw) * smoothFactor;
  const finalRoll = prevRoll + (currentRoll - prevRoll) * smoothFactor;

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

export const useTrackingStore = create((set) => ({
  isTracking: false,
  toggleTracking: () => set((state) => ({ isTracking: !state.isTracking })),
}));

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
        toast.success("تمت المعايرة بنجاح", {
          style: { background: "#333", color: "#fff" },
        });
      },
    );

    if (newMetrics) {
      const filteredMetrics = applySmartFilter(newMetrics);
      set({ landmarks: newLandmarks, metrics: filteredMetrics });
    } else {
      set({ landmarks: newLandmarks });
    }
  },
}));

export const useUIStore = create((set) => ({
  setAppError: (msg) => {
    if (msg) {
      toast.error(msg, {
        id: "app-error",
        style: {
          borderRadius: "8px",
          background: "#222",
          color: "#fff",
          border: "1px solid #ff4b4b",
        },
      });
    }
  },

  setAppSuccess: (msg) => {
    if (msg) {
      toast.success(msg, {
        id: "app-success",
        style: {
          borderRadius: "8px",
          background: "#222",
          color: "#fff",
          border: "1px solid #10b981",
        },
      });
    }
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
  setModelUrl: (url) =>
    set((state) => {
      if (state.modelUrl && state.modelUrl.startsWith("blob:")) {
        URL.revokeObjectURL(state.modelUrl);
      }
      return { modelUrl: url };
    }),

  modelBlendshapes: [],
  setModelBlendshapes: (shapes) => set({ modelBlendshapes: shapes }),

  isSettingsOpen: false,
  toggleSettings: () =>
    set((state) => ({ isSettingsOpen: !state.isSettingsOpen })),

  pixelRatio: 2,
  setPixelRatio: (val) => set({ pixelRatio: parseFloat(val) }),

  enableHairPhysics: true,
  setEnableHairPhysics: (val) => set({ enableHairPhysics: val }),

  cameraResolution: "640x480",
  setCameraResolution: (val) => set({ cameraResolution: val }),

  enableAntialias: true,
  toggleAntialias: () =>
    set((state) => ({ enableAntialias: !state.enableAntialias })),

  enableShadows: true,
  toggleShadows: () =>
    set((state) => ({ enableShadows: !state.enableShadows })),

  enableHDRI: true,
  toggleHDRI: () => set((state) => ({ enableHDRI: !state.enableHDRI })),

  trackingFPS: 30,
  setTrackingFPS: (val) => set({ trackingFPS: parseInt(val) }),
}));
