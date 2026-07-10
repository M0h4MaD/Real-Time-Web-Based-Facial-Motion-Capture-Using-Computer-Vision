// src/utils/recorder.js
let mediaRecorder;
let recordedChunks = [];

export const startRecording = () => {
  // البحث عن الـ canvas الخاص بالمجسم
  const canvas = document.querySelector('canvas');
  if (!canvas) {
    alert("لم يتم العثور على المجسم للتسجيل!");
    return;
  }

  // التقاط الفيديو بمعدل 30 إطار في الثانية
  const stream = canvas.captureStream(30);
  mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
  recordedChunks = [];

  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) recordedChunks.push(e.data);
  };

  mediaRecorder.onstop = () => {
    // تجميع الفيديو وتحميله تلقائياً
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Avatar-Record-${Date.now()}.webm`;
    a.click();
    URL.revokeObjectURL(url);
  };

  mediaRecorder.start();
};

export const stopRecording = () => {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
};