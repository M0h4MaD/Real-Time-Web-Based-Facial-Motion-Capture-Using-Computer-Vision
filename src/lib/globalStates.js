// File: src/lib/globalStates.js
// Description: Central Zustand stores. Holds UI settings, the tracking flag,
// and the face metrics/landmarks. Also includes an FPS-independent smart
// filter that smooths head rotations before they reach the model.

import { create } from "zustand";
import { processFaceMetrics } from "./FaceCalculations";
import toast from "react-hot-toast";

// Smart filter to prevent axis cross-talk and smooth motion.
// Smoothing is now FPS-independent (delta-time corrected). Previously a fixed
// smoothFactor was applied per call regardless of actual time elapsed, causing
// different motion feel when Tracking FPS changed. Now the actual time delta
// is measured and the smoothing factor is corrected accordingly, keeping motion
// feel consistent regardless of FPS.
let prevPitch = 0;
let prevYaw = 0;
let prevRoll = 0;
let prevFilterTime = null;

const SMOOTH_FACTOR_BASE = 0.5;
const REFERENCE_INTERVAL_MS = 1000 / 30;
const MAX_TIME_SCALE = 5;

// Apply smart smoothing to raw face metrics to reduce jitter and prevent axis cross-talk
const applySmartFilter = (rawMetrics) => {
  // Pass through if there are no metrics
  if (!rawMetrics) return rawMetrics;

  // Current timestamp
  const now = performance.now();
  // Elapsed time since last call (or the reference on first call)
  const dt =
    prevFilterTime === null ? REFERENCE_INTERVAL_MS : now - prevFilterTime;
  // Update the previous timestamp
  prevFilterTime = now;

  // Time scale relative to the reference interval, capped
  const timeScale = Math.min(MAX_TIME_SCALE, dt / REFERENCE_INTERVAL_MS);
  // Convert the base factor into a time-corrected smoothing factor
  const smoothFactor = 1 - Math.pow(1 - SMOOTH_FACTOR_BASE, timeScale);

  // Damping applied to pitch when yaw is large (reduces cross-talk)
  let pitchDamping = 1.0;

  // Reduce pitch damping when the head is turned far
  if (rawMetrics.yaw !== undefined && Math.abs(rawMetrics.yaw) > 0.25) {
    pitchDamping = 0.15;
  }

  // Resolve current values (fall back to previous if missing)
  const currentPitch =
    rawMetrics.pitch !== undefined ? rawMetrics.pitch : prevPitch;
  const currentYaw = rawMetrics.yaw !== undefined ? rawMetrics.yaw : prevYaw;
  const currentRoll =
    rawMetrics.roll !== undefined ? rawMetrics.roll : prevRoll;

  // Exponential smoothing of pitch (with damping)
  const finalPitch =
    prevPitch + (currentPitch - prevPitch) * (smoothFactor * pitchDamping);
  // Exponential smoothing of yaw
  const finalYaw = prevYaw + (currentYaw - prevYaw) * smoothFactor;
  // Exponential smoothing of roll
  const finalRoll = prevRoll + (currentRoll - prevRoll) * smoothFactor;

  // Store the smoothed values as the new previous values
  prevPitch = finalPitch;
  prevYaw = finalYaw;
  prevRoll = finalRoll;

  // Return the metrics with smoothed rotations
  return {
    ...rawMetrics,
    pitch: finalPitch,
    yaw: finalYaw,
    roll: finalRoll,
  };
};

// Store for the tracking on/off flag
export const useTrackingStore = create((set) => ({
  isTracking: false,
  toggleTracking: () => set((state) => ({ isTracking: !state.isTracking })),
}));

// Store for face metrics, landmarks, and calibration
export const useFaceStore = create((set, get) => ({
  metrics: { yaw: 0, mouth: 0, blink: 0 },
  landmarks: [],
  calibrationBaseline: null,
  isCalibrating: false,

  // Start the calibration process
  triggerCalibration: () => set({ isCalibrating: true }),

  // Store new landmarks, compute metrics, and update state
  setLandmarks: (newLandmarks) => {
    // Ignore empty landmark arrays
    if (!newLandmarks || newLandmarks.length === 0) return;
    // Read current calibration state
    const { calibrationBaseline, isCalibrating } = get();

    // Process the landmarks into metrics (with calibration callback)
    const newMetrics = processFaceMetrics(
      newLandmarks,
      calibrationBaseline,
      isCalibrating,
      (baselineData) => {
        // Save the baseline and stop calibrating
        set({ calibrationBaseline: baselineData, isCalibrating: false });
        // Notify the user of success
        toast.success("تمت المعايرة بنجاح", {
          style: { background: "#333", color: "#fff" },
        });
      },
    );

    // If metrics were produced (not during calibration)
    if (newMetrics) {
      // Smooth the metrics and update store
      const filteredMetrics = applySmartFilter(newMetrics);
      set({ landmarks: newLandmarks, metrics: filteredMetrics });
    } else {
      // Otherwise just store the raw landmarks
      set({ landmarks: newLandmarks });
    }
  },
}));

// Store for all UI settings and toasts
export const useUIStore = create((set) => ({
  // Show an error toast (deduplicated by id)
  setAppError: (msg) => {
    // Only show if a message was provided
    if (msg) {
      toast.error(msg, {
        // Fixed id so repeated errors replace each other
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

  // Show a success toast (deduplicated by id)
  setAppSuccess: (msg) => {
    // Only show if a message was provided
    if (msg) {
      toast.success(msg, {
        // Fixed id so repeated successes replace each other
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

  // Whether the HUD panel is visible
  isHUDVisible: true,
  // Toggle the HUD visibility
  toggleHUD: () => set((state) => ({ isHUDVisible: !state.isHUDVisible })),

  // Current landmark overlay mode
  landmarkMode: "off",
  // Set the landmark overlay mode
  setLandmarkMode: (mode) => set({ landmarkMode: mode }),

  // Whether the view is mirrored
  isMirrored: false,
  // Toggle the mirror setting
  toggleMirror: () => set((state) => ({ isMirrored: !state.isMirrored })),

  // Whether recording is active
  isRecording: false,
  // Set the recording status
  setIsRecording: (status) => set({ isRecording: status }),

  // Whether green-screen background is enabled
  isGreenScreen: false,
  // Toggle the green-screen setting
  toggleGreenScreen: () =>
    set((state) => ({ isGreenScreen: !state.isGreenScreen })),

  // The current model URL
  modelUrl: "/Adam.glb",
  // Set the model URL, revoking any prior blob URL
  setModelUrl: (url) =>
    set((state) => {
      // Revoke an old blob URL to free memory
      if (state.modelUrl && state.modelUrl.startsWith("blob:")) {
        URL.revokeObjectURL(state.modelUrl);
      }
      // Apply the new URL
      return { modelUrl: url };
    }),

  // Discovered model blendshapes
  modelBlendshapes: [],
  // Set the model blendshapes list
  setModelBlendshapes: (shapes) => set({ modelBlendshapes: shapes }),

  // Whether the settings panel is open
  isSettingsOpen: false,
  // Toggle the settings panel
  toggleSettings: () =>
    set((state) => ({ isSettingsOpen: !state.isSettingsOpen })),

  // Render pixel ratio
  pixelRatio: 2,
  // Set the pixel ratio (parsed as float)
  setPixelRatio: (val) => set({ pixelRatio: parseFloat(val) }),

  // Whether hair physics is enabled
  enableHairPhysics: true,
  // Set the hair physics flag
  setEnableHairPhysics: (val) => set({ enableHairPhysics: val }),

  // Camera resolution string
  cameraResolution: "640x480",
  // Set the camera resolution
  setCameraResolution: (val) => set({ cameraResolution: val }),

  // Whether antialiasing is enabled
  enableAntialias: true,
  // Toggle the antialiasing setting
  toggleAntialias: () =>
    set((state) => ({ enableAntialias: !state.enableAntialias })),

  // Whether shadows are enabled
  enableShadows: true,
  // Toggle the shadows setting
  toggleShadows: () =>
    set((state) => ({ enableShadows: !state.enableShadows })),

  // Whether HDRI environment is enabled
  enableHDRI: true,
  // Toggle the HDRI setting
  toggleHDRI: () => set((state) => ({ enableHDRI: !state.enableHDRI })),

  // Tracking FPS target
  trackingFPS: 30,
  // Set the tracking FPS (parsed as int)
  setTrackingFPS: (val) => set({ trackingFPS: parseInt(val) }),
}));