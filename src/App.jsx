// App.jsx
import { useRef, useEffect, useState } from "react";
import FaceTracker from "./components/FaceTracker";

export default function App() {
  const videoRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // هذه الخطوة تضمن أن الـ videoRef تم ربطه فعلياً بالعنصر
    if (videoRef.current) {
      setIsReady(true);
    }
  }, []);

  return (
    <>
      <video ref={videoRef} style={{ display: "none" }} autoPlay playsInline muted />
      
      {/* لا تشغل الـ FaceTracker إلا بعد أن نتأكد أن الـ videoRef جاهز */}
      {isReady && (
        <FaceTracker 
          videoRef={videoRef} 
          onResults={(data) => console.log(data)} 
        />
      )}
    </>
  );
}