// src/Components/TrackingOverlay.jsx
import { useRef, useState } from 'react';
import { Rnd } from 'react-rnd';
import { useTrackingStore } from '../lib/globalStates.js'; 
import FaceTracker from './FaceTracker';
import LandmarksOverlay from './LandmarksOverlay';
import './styles/TrackingOverlay.css';

export default function TrackingOverlay() {
  const { isTracking, toggleTracking } = useTrackingStore(); 
  const videoRef = useRef(null);
  
  // 🔥 حالة تتبع ما إذا كان المستخدم يقوم بسحب أو تغيير حجم النافذة
  const [isInteracting, setIsInteracting] = useState(false);

  return (
    <>
      <div className='floating-container'>
        <button className='toggle-btn' onClick={toggleTracking}>
          {isTracking ? "Stop tracking" : "Start Tracking"}
        </button>
      </div>

      {isTracking && (
        <Rnd
          default={{ x: 20, y: 70, width: 320, height: 240 }}
          minWidth={200}
          minHeight={150}
          bounds="window"
          className="draggable-video-window"
          style={{ zIndex: 9999 }}
          dragHandleClassName="drag-handle"
          // 🔥 التقاط بداية ونهاية التحريك وتغيير الحجم
          onDragStart={() => setIsInteracting(true)}
          onDragStop={() => setIsInteracting(false)}
          onResizeStart={() => setIsInteracting(true)}
          onResizeStop={() => setIsInteracting(false)}
        >
          <div className="drag-handle">
            <div className="drag-icon"></div>
          </div>

          <div className='video-wrapper'>
            <video 
               className='video' 
               ref={videoRef} 
               autoPlay 
               playsInline 
               muted 
               // بهت الفيديو أثناء السحب لإعطاء تغذية بصرية بأنه متوقف
               style={{ opacity: isInteracting ? 0.3 : 1, transition: 'opacity 0.2s' }}
            />
            
            {/* إيقاف رسم النقاط أثناء السحب لتوفير الأداء */}
            {!isInteracting && <LandmarksOverlay />} 
            
            {/* 
              تمرير حالة الإيقاف للمتتبع الذكي.
              تأكد من تعديل ملف FaceTracker.jsx لاحقاً ليقرأ prop (isPaused) 
              ويوقف حلقة requestAnimationFrame إذا كانت قيمتها true
            */}
            <FaceTracker videoRef={videoRef} isActive={isTracking} isPaused={isInteracting} />

            {/* تأثير بصري جميل يظهر فوق الفيديو عند سحبه */}
            {isInteracting && (
              <div className="paused-indicator">
                Tracking Paused...
              </div>
            )}
          </div>
        </Rnd>
      )}
    </>
  );
}