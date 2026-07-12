// src/Components/TrackingOverlay.jsx
import { useRef } from 'react';
import { Rnd } from 'react-rnd';
import { useTrackingStore } from '../lib/globalStates.js'; 
import FaceTracker from './FaceTracker';
import LandmarksOverlay from './LandmarksOverlay';
import './styles/TrackingOverlay.css';

export default function TrackingOverlay() {
  const { isTracking, toggleTracking } = useTrackingStore(); 
  const videoRef = useRef(null);

  return (
    <>
      <div className='floating-container'>
        <button className='toggle-btn' onClick={toggleTracking}>
          {isTracking ? "Stop tracking" : "Start Tracking"}
        </button>
      </div>

      {isTracking && (
        <Rnd
          default={{
            x: 20,
            y: 70,
            width: 320,
            height: 240,
          }}
          minWidth={200}
          minHeight={150}
          bounds="window"
          className="draggable-video-window"
          style={{ zIndex: 9999 }}
          dragHandleClassName="drag-handle" // 🔥 السر هنا: تحديد الكلاس المسؤول عن السحب حصراً
        >
          {/* 🔥 شريط السحب العلوي */}
          <div className="drag-handle">
            <div className="drag-icon"></div>
          </div>

          <div className='video-wrapper'>
            <video className='video' ref={videoRef} autoPlay playsInline muted />
            <LandmarksOverlay /> 
            <FaceTracker videoRef={videoRef} isActive={isTracking} />
          </div>
        </Rnd>
      )}
    </>
  );
}