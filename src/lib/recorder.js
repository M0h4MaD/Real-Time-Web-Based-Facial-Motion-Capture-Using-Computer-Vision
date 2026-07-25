// File: src/lib/recorder.js
// Description: Recording subsystem. Supports two modes: "keyframes" (captures
// face-metric frames to JSON) and "video" (captures the canvas + mic to a
// WEBM). Includes a RAM cap to avoid OOM and a download helper.

let recordedFrames = []; // Stores keyframe data when recording in "keyframes" mode
let isRecordingStatus = false; 
let currentRecordMode = "keyframes";

let mediaRecorder = null; // MediaRecorder instance for video recording
let recordedChunks = []; // Array to store video data chunks
let micStream = null; // Microphone audio stream

const MAX_RECORDING_FRAMES = 18000;  // 3min on 60fps

// Start recording in the specified mode ("keyframes" or "video").
// This initializes the recording subsystem, resets any previous recording data,
// and returns a promise that resolves to true on success or false on failure.
export const startRecording = async (mode = "keyframes") => {
  // Remember which mode we are recording in so other functions know how to behave
  currentRecordMode = mode;

  // KEYFRAMES MODE: records face-metric data frames to memory as JSON
  if (mode === "keyframes") {
    // Clear any previously recorded frames
    recordedFrames = [];
    // Mark recording as active so recordCurrentFrame starts capturing
    isRecordingStatus = true;
    // Log start for debugging
    console.log(" Starts KeyFrame Recording 🔴 ");
    // Success — no external permissions needed
    return true;
  }

  // VIDEO MODE: records the 3D canvas + microphone audio to a WEBM file
  else if (mode === "video") {
    try {
      // Clear any previously recorded video chunks
      recordedChunks = [];
      // Find the 3D canvas element in the DOM to capture its output
      const canvas = document.querySelector("canvas");

      // Bail if the canvas is not found (should not happen in normal use)
      if (!canvas) {
        alert("3D Canvas not found!");
        return false;
      }

      // Capture the canvas as a video stream at 60 frames per second
      const canvasStream = canvas.captureStream(60);
      // Request microphone access from the user
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Combine the canvas video track and the microphone audio track into one stream
      const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...micStream.getAudioTracks(),
      ]);

      // Create a MediaRecorder to capture the combined stream as WEBM
      mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: "video/webm",
      });

      // Collect recorded data chunks as they become available
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunks.push(e.data);
      };

      // When recording stops, export the video and clean up the mic stream
      mediaRecorder.onstop = () => {
        exportVideo();
        if (micStream) micStream.getTracks().forEach((track) => track.stop());
      };

      // Begin recording
      mediaRecorder.start();
      // Mark recording as active
      isRecordingStatus = true;
      // Log start for debugging
      console.log("Started Video & Audio Recording 🔴 ");
      // Success
      return true;
    } catch (err) {
      // Log microphone or recorder errors
      console.error("Error in Mic", err);
      // Alert the user if mic permission was denied or recorder failed
      alert("Microphone permission denied!");
      return false;
    }
  }
};

export const recordCurrentFrame = (mocapData) => {
  if (isRecordingStatus && currentRecordMode === "keyframes" && mocapData) {
    // RAM protection: stop automatically when the frame cap is reached
    if (recordedFrames.length >= MAX_RECORDING_FRAMES) {
      console.warn("⚠️ تم الوصول للحد الأقصى للذاكرة، تم إيقاف التسجيل تلقائياً.");
      stopRecording();
      return;
    }

    recordedFrames.push({
      time: Date.now(),
      data: { ...mocapData },
    });
  }
};

export const stopRecording = () => {
  if (!isRecordingStatus) return;
  isRecordingStatus = false;

  if (currentRecordMode === "keyframes") exportAnimation();
  else if (currentRecordMode === "video" && mediaRecorder) mediaRecorder.stop();
};

const exportAnimation = () => {
  if (recordedFrames.length === 0) return;

  console.log("Processing JSON export in background...");
  // Defer the heavy stringify by 100ms to keep the UI responsive
  setTimeout(() => {
    try {
      const blob = new Blob([JSON.stringify(recordedFrames, null, 2)], {type: "application/json"});
      downloadBlob(blob, `Adam_Mocap_${new Date().toISOString().slice(0, 10)}.json`);
    } catch (error) {
      console.error("خطأ أثناء معالجة ملف التسجيل:", error);
    }
  }, 100);
};

const exportVideo = () => {
  if (recordedChunks.length === 0) return;
  const blob = new Blob(recordedChunks, { type: "video/webm" });
  downloadBlob(
    blob,
    `Adam_Video_${new Date().toISOString().slice(0, 10)}.webm`,
  );
};

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};