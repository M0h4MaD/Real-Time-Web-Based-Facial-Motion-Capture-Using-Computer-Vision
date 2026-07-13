// src/lib/recorder.js

let recordedFrames = [];
let isRecordingStatus = false;
let currentRecordMode = "keyframes";

let mediaRecorder = null;
let recordedChunks = [];
let micStream = null;

// 🛠️ CONFIG: حماية الذاكرة العشوائية (RAM)
// 18000 إطار يعادل تقريباً 5 دقائق من التسجيل على 60 إطار في الثانية
const MAX_RECORDING_FRAMES = 18000; 

export const startRecording = async (mode = "keyframes") => {
  currentRecordMode = mode;

  if (mode === "keyframes") {
    recordedFrames = [];
    isRecordingStatus = true;
    console.log(" Starts KeyFrame Recording 🔴 ");
    return true;
  }

  else if (mode === "video") {
    try {
      recordedChunks = [];
      const canvas = document.querySelector("canvas");

      if (!canvas) {
        alert("3D Canvas not found!");
        return false;
      }

      const canvasStream = canvas.captureStream(60);
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...micStream.getAudioTracks(),
      ]);

      mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: "video/webm",
      });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        exportVideo();
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

export const recordCurrentFrame = (mocapData) => {
  if (isRecordingStatus && currentRecordMode === "keyframes" && mocapData) {
    // ⚡ حماية من تسرب الذاكرة الكلي (OOM)
    if (recordedFrames.length >= MAX_RECORDING_FRAMES) {
      console.warn("⚠️ تم الوصول للحد الأقصى للذاكرة، تم إيقاف التسجيل تلقائياً.");
      stopRecording();
      return;
    }
    
    // استخدام النسخ السطحي للحفاظ على سرعة الـ Garbage Collector
    recordedFrames.push({
      time: Date.now(),
      data: { ...mocapData },
    });
  }
};

export const stopRecording = () => {
  if (!isRecordingStatus) return; // منع التنفيذ المزدوج
  isRecordingStatus = false;
  
  if (currentRecordMode === "keyframes") exportAnimation();
  else if (currentRecordMode === "video" && mediaRecorder) mediaRecorder.stop();
};

const exportAnimation = () => {
  if (recordedFrames.length === 0) return;
  
  console.log("Processing JSON export in background...");
  // ⚡ تأخير عملية الـ Stringify لثانية واحدة للسماح للواجهة بالاستجابة وعدم التجميد
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
  setTimeout(() => URL.revokeObjectURL(url), 1000); // ⚡ تنظيف الذاكرة بعد التحميل
};