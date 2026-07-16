// src/lib/globalStates.js
import { create } from "zustand";
import { processFaceMetrics } from "./FaceCalculations";
import toast from "react-hot-toast";

// نظام فلترة ذكي لمنع تداخل المحاور (Cross-talk) وتنعيم الحركة
let prevPitch = 0;
let prevYaw = 0;
let prevRoll = 0;

const applySmartFilter = (rawMetrics) => {
  if (!rawMetrics) return rawMetrics;

  const smoothFactor = 0.5;
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

  // ⚡ الإعدادات الهندسية
  enableAntialias: true,
  toggleAntialias: () =>
    set((state) => ({ enableAntialias: !state.enableAntialias })),

  enableShadows: true,
  toggleShadows: () =>
    set((state) => ({ enableShadows: !state.enableShadows })),

  enableHDRI: true,
  toggleHDRI: () => set((state) => ({ enableHDRI: !state.enableHDRI })),

  // ⚡ الإعداد الجديد: التحكم في سرعة التتبع
  trackingFPS: 30, // 30 إطاراً في الثانية كقيمة افتراضية
  setTrackingFPS: (val) => set({ trackingFPS: parseInt(val) }),
}));