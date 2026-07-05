import { useRef } from 'react';
import { useTrackingStore } from '../lib/globalStates.js'; 
import FaceTracker from './FaceTracker';
import './styles/TrackingOverlay.css';

export default function TrackingOverlay() {

  // Using Zustand store to manage tracking state
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
          <FaceTracker 
            videoRef={videoRef} 
            isActive={isTracking} 
            onResults={(data) => console.log("Face coordinates", data)} 
          />
        </div>
      )}
    </div>
  );
}

