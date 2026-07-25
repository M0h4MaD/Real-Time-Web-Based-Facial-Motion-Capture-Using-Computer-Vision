// File: src/Components/TrackingOverlay.jsx
// Description: The floating, draggable/resizable window that hosts the
// tracking video feed, the FaceTracker worker driver, and the landmarks
// overlay. Provides a start/stop tracking button and pauses visuals while
// the user is interacting (dragging/resizing).

import { useRef, useState } from 'react';
import { Rnd } from 'react-rnd';
import { useTrackingStore } from '../lib/globalStates.js';
import FaceTracker from './FaceTracker';
import LandmarksOverlay from './LandmarksOverlay';
import './styles/TrackingOverlay.css';

// TrackingOverlay component that manages the draggable tracking window
export default function TrackingOverlay() {
  // Get the tracking flag and its toggle from the store
  const { isTracking, toggleTracking } = useTrackingStore();
  // Ref to the <video> element inside the tracking window
  const videoRef = useRef(null);

  // Track whether the user is dragging or resizing the window
  const [isInteracting, setIsInteracting] = useState(false);

  return (
    // Fragment wrapper (no extra DOM node)
    <>
      {/* Container for the start/stop button */}
      <div className='floating-container'>
        {/* Button to toggle tracking on/off */}
        <button className='toggle-btn' onClick={toggleTracking}>
          {/* Label reflects tracking state */}
          {isTracking ? "Stop tracking" : "Start Tracking"}
        </button>
      </div>

      {/* Render the draggable window only while tracking is active */}
      {isTracking && (
        // Rnd draggable/resizable window from react-rnd
        <Rnd
          // Initial size and position
          default={{ x: 20, y: 70, width: 320, height: 240 }}
          // Minimum width
          minWidth={200}
          // Minimum height
          minHeight={150}
          // Keep within the window bounds
          bounds="window"
          // Class for styling
          className="draggable-video-window"
          // Stack above other UI
          style={{ zIndex: 9999 }}
          // CSS class used as the drag handle
          dragHandleClassName="drag-handle"
          // Mark interacting true when dragging starts
          onDragStart={() => setIsInteracting(true)}
          // Mark interacting false when dragging stops
          onDragStop={() => setIsInteracting(false)}
          // Mark interacting true when resizing starts
          onResizeStart={() => setIsInteracting(true)}
          // Mark interacting false when resizing stops
          onResizeStop={() => setIsInteracting(false)}
        >
          {/* The drag handle bar */}
          <div className="drag-handle">
            {/* The grabber icon line */}
            <div className="drag-icon"></div>
          </div>

          {/* Wrapper around the video + overlays */}
          <div className='video-wrapper'>
            {/* The tracking video element */}
            <video
              className='video'
              ref={videoRef}
              autoPlay
              playsInline
              muted
              // Dim the video while interacting for visual feedback
              style={{ opacity: isInteracting ? 0.3 : 1, transition: 'opacity 0.2s' }}
            />

            {/* Render the landmarks overlay only when not interacting to save performance */}
            {!isInteracting && <LandmarksOverlay />}

            {/* Drive the worker with the video, activity, and pause state */}
            <FaceTracker videoRef={videoRef} isActive={isTracking} isPaused={isInteracting} />

            {/* Show a paused indicator while interacting */}
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