import { create } from 'zustand';
import { processFaceMetrics } from './FaceCalculations';

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
      }
    );
    
    if (newMetrics) {
      set({ landmarks: newLandmarks, metrics: newMetrics });
    } else {
      set({ landmarks: newLandmarks });
    }
  },
}));

export const useUIStore = create((set) => ({
  isHUDVisible: true,
  toggleHUD: () => set((state) => ({ isHUDVisible: !state.isHUDVisible })),
  showLandmarks: false,
  toggleLandmarks: () => set((state) => ({ showLandmarks: !state.showLandmarks })),
}));