// src/Components/TrackingOverlay.jsx
import { useRef } from 'react';
import { useTrackingStore } from '../lib/globalStates.js'; 
import FaceTracker from './FaceTracker';
import LandmarksOverlay from './LandmarksOverlay'; // استيراد المكون الجديد
import './styles/TrackingOverlay.css';

export default function TrackingOverlay() {
  const { isTracking, toggleTracking } = useTrackingStore(); 
  const videoRef = useRef(null);

  return (
    <div className='floating-container'>
      <button className='toggle-btn' onClick={toggleTracking}>
        {isTracking ? "Stop tracking" : "Start Tracking"}
      </button>

      {isTracking && (
        <div className='video-wrapper'>
          <video className='video' ref={videoRef} autoPlay playsInline muted />
          <LandmarksOverlay /> 
          <FaceTracker videoRef={videoRef} isActive={isTracking} />
        </div>
      )}
    </div>
  );
}