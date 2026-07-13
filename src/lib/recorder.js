// src/lib/recorder.js
let recordedFrames = []; // Stores keyframe animation data
let isRecordingStatus = false; // Indicates if recording is active
let currentRecordMode = "keyframes"; // Current recording mode ('keyframes' or 'video')

let mediaRecorder = null; // MediaRecorder instance
let recordedChunks = []; // Stores video data chunks
let micStream = null; // Stores microphone audio stream

// Recording Controller
export const startRecording = async (mode = "keyframes") => {
  currentRecordMode = mode; // Select mode

  // For mode KeyFrames
  if (mode === "keyframes") {
    recordedFrames = [];
    isRecordingStatus = true;
    console.log(" Starts KeyFrame Recording 🔴 ");
    return true;
  }

  // For mode Vido
  else if (mode === "video") {
    try {
      recordedChunks = [];
      const canvas = document.querySelector("canvas"); // Get canvas element

      // If canvas not found
      if (!canvas) {
        alert("3D Canvas not found!");
        return false;
      }

      // 1. Record Canvas Stream with 60 FPS
      const canvasStream = canvas.captureStream(60);

      // 2. Asks for microphone permission
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // 3. Combine Vid&Aud streams
      const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...micStream.getAudioTracks(),
      ]);

      // Initialize MediaRecorder
      mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: "video/webm",
      });

      // Checks for data availability and pushes recorded chunks
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunks.push(e.data);
      };

      // Handle stop event - export video and close mic
      mediaRecorder.onstop = () => {
        exportVideo();
        // Close the mic stream after stopping recording
        if (micStream) micStream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      isRecordingStatus = true;
      console.log("Started Video & Audio Recording 🔴 ");
      return true;
    } catch (err) {
      console.error("Error in Mic", err);
      alert("Microphone permission denied!");
      return false;
    }
  }
};

// Storing keyframe data Function
export const recordCurrentFrame = (mocapData) => {
  if (isRecordingStatus && currentRecordMode === "keyframes" && mocapData) {
    recordedFrames.push({
      time: Date.now(),
      data: JSON.parse(JSON.stringify(mocapData)),
    }); // Stores the mocapData (KeyFrames Data)
  }
};

// Stop Recording based on mode
export const stopRecording = () => {
  isRecordingStatus = false;
  if (currentRecordMode === "keyframes") exportAnimation();
  else if (currentRecordMode === "video" && mediaRecorder) mediaRecorder.stop();
};

// Export animation Data
const exportAnimation = () => {
  if (recordedFrames.length === 0) return;
  const blob = new Blob([JSON.stringify(recordedFrames, null, 2)], {type: "application/json",}); // Create JSON blob from recorded frames
  downloadBlob(blob,`Adam_Mocap_${new Date().toISOString().slice(0, 10)}.json`, // Download keyframe animation
  );
};

/*What is Blob
 * Represents immutable raw binary data.
 * Used to store data that doesn't fit into native JavaScript types.
 * Can be used for file uploads/downloads, canvas data, etc.
 */

// Export Video Data
const exportVideo = () => {
  if (recordedChunks.length === 0) return;
  const blob = new Blob(recordedChunks, { type: "video/webm" }); // Create video blob from recorded chunks
  downloadBlob(
    blob,
    `Adam_Video_${new Date().toISOString().slice(0, 10)}.webm`,
  );
};

// Helper function to trigger file download
const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob); // Create object URL from blob
  const link = document.createElement("a"); // Create anchor element
  link.href = url; // Set href to object URL
  link.download = filename; // Set download filename
  document.body.appendChild(link); // Add link to DOM
  link.click(); // Trigger download
  document.body.removeChild(link); // Remove link from DOM
  URL.revokeObjectURL(url); // Release memory
};