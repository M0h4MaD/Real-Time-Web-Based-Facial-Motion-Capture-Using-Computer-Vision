import { create } from 'zustand';

export const useTrackingStore = create((set) => ({
 // First state: isTracking, initialized to false
  isTracking: false,
  
  // Control function to toggle the tracking state
  toggleTracking: () => set((state) => ({ isTracking: !state.isTracking })),
}));

export const useFaceStore = create((set) => ({
  // Starting metrics for yaw, mouth, and blink
  metrics: { yaw: 0, mouth: 0, blink: 0 },
  
  // Function to update the metrics in the store
  setMetrics: (newMetrics) => set({ metrics: newMetrics }),
}))

export const useUIStore = create((set) => ({
  isHUDVisible: true,
  toggleHUD: () => set((state) => ({ isHUDVisible: !state.isHUDVisible })),
}));