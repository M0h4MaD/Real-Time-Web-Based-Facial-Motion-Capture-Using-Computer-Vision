import { create } from "zustand";
import { processFaceMetrics } from "./FaceCalculations";




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
      set({ landmarks: newLandmarks, metrics: newMetrics });
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
