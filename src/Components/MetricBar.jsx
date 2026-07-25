// File: src/Components/MetricBar.jsx
// Description: A single labeled progress bar that subscribes to one face
// metric from the face store and renders its value (rotation in degrees or
// percentage) with an animated fill width.

import React from "react";
import { useFaceStore } from "../lib/globalStates";

// MetricBar component: label is the display text, metricKey selects the store value
const MetricBar = ({ label, metricKey }) => {
  // Subscribe atomically to just this metric value so the bar only updates when this metric changes
  const value = useFaceStore((state) => state.metrics[metricKey]);

  // Fallback to 0 for invalid/undefined values
  const safeValue = isNaN(value) || value === undefined ? 0 : value;
  // Detect whether this is a rotation metric (yaw)
  const isRotation = label.toLowerCase().includes("yaw");

  // Display value: degrees for rotation, percentage otherwise
  const displayValue = isRotation
    ? Math.round(safeValue * (180 / Math.PI))
    : Math.round(safeValue * 100);

  // Fill width: clamp rotation within +/-90deg, percentage within 0-100
  const progressWidth = isRotation
    ? Math.min((Math.abs(displayValue) / 90) * 100, 100)
    : Math.min(Math.max(displayValue, 0), 100);

  // Text shown next to the label (with degree/percent symbol)
  const formattedText = isRotation ? `${displayValue}°` : `${displayValue}%`;

  return (
    // Outer container for the metric
    <div className="metric-container">
      {/* Header row with label and value */}
      <div className="metric-header">
        {/* Metric label */}
        <span className="metric-label">{label}</span>
        {/* Metric numeric value */}
        <span className="metric-value">{formattedText}</span>
      </div>
      {/* Track that holds the fill */}
      <div className="metric-track">
        {/* The moving fill whose width reflects the value */}
        <div
          className="metric-fill"
          style={{ width: `${progressWidth}%` }}
        ></div>
      </div>
    </div>
  );
};

// Memoize the bar to avoid unnecessary re-renders
export default React.memo(MetricBar);