import { create } from 'zustand';
import { processFaceMetrics } from './FaceCalculations';

export const useTrackingStore = create((set) => ({
 // First state: isTracking, initialized to false
  isTracking: false,
  
  // Control function to toggle the tracking state
  toggleTracking: () => set((state) => ({ isTracking: !state.isTracking })),
}));

export const useFaceStore = create((set) => ({
  metrics: { yaw: 0, mouth: 0, blink: 0 },
  landmarks: [],

  setLandmarks: (newLandmarks) => {
    // 1. تحديث النقاط
    // 2. حساب المقياس الجديد فوراً وتحديثه
    const newMetrics = processFaceMetrics(newLandmarks);
    
    set({ 
      landmarks: newLandmarks,
      metrics: newMetrics 
    });
  },
}));

export const useUIStore = create((set) => ({
  isHUDVisible: true,
  toggleHUD: () => set((state) => ({ isHUDVisible: !state.isHUDVisible })),

  showLandmarks: false,
  toggleLandmarks: () => set((state) => ({ showLandmarks: !state.showLandmarks })),
}));