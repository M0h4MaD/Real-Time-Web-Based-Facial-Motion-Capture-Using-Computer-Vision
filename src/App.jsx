// src/App.jsx
import TrackingOverlay from './Components/TrackingOverlay.jsx';
import HUD from './Components/HUD.jsx'; 
import { processFaceMetrics } from './lib/FaceCalculations.js';
import { useFaceStore } from './lib/globalStates.js'; 
import { useUIStore } from './lib/globalStates.js'; // Importing the new UI Store
import './App.css';

export default function App() {

  // Get the HUD visibility state and toggle function from the store
  const { isHUDVisible, toggleHUD } = useUIStore();

  // Get the setMetrics function from the store to update metrics
  const setMetrics = useFaceStore((state) => state.setMetrics);

  // Function to handle the results from the tracking overlay
  const handleResults = (rawLandmarks) => {
    // 1. Processing the raw landmarks to get the metrics
    const metrics = processFaceMetrics(rawLandmarks);
    
    // 2. Updating the store with the new metrics
    setMetrics(metrics);
  };

  return (
    <div className="app-container">
      
      {/* Toggle button to show/hide HUD */}
      <button className="toggle-btn" onClick={toggleHUD}>
        {isHUDVisible ? 'Hide HUD' : 'Show HUD'}
      </button>

      <main className="main-content">
        <h2>3D Tracking Space</h2>
        
        {/* Conditional rendering: HUD only displays if isHUDVisible is true */}
        {isHUDVisible && <HUD />}
      </main>

      {/* The TrackingOverlay remains running in the background */}
      <TrackingOverlay onResults={handleResults} />
    </div>
  );
}