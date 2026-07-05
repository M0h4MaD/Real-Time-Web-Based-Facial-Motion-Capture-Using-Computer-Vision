import { create } from 'zustand';

export const useTrackingStore = create((set) => ({
 // First state: isTracking, initialized to false
  isTracking: false,
  
  // Control function to toggle the tracking state
  toggleTracking: () => set((state) => ({ isTracking: !state.isTracking })),
}));