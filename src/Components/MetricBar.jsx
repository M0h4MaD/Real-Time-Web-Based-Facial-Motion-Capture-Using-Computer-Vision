// src/Components/MetricBar.jsx
import React from "react";
import { useFaceStore } from "../lib/globalStates";

// أضفنا metricKey لكي يسحب المكون بياناته بنفسه
const MetricBar = ({ label, metricKey }) => {
  // ⚡ اشتراك ذري: هذا المكون سيتحدث فقط إذا تغيرت هذه القيمة المحددة
  const value = useFaceStore((state) => state.metrics[metricKey]);

  const safeValue = isNaN(value) || value === undefined ? 0 : value;
  const isRotation = label.toLowerCase().includes("yaw");

  const displayValue = isRotation
    ? Math.round(safeValue * (180 / Math.PI))
    : Math.round(safeValue * 100);

  const progressWidth = isRotation
    ? Math.min((Math.abs(displayValue) / 90) * 100, 100)
    : Math.min(Math.max(displayValue, 0), 100);

  const formattedText = isRotation ? `${displayValue}°` : `${displayValue}%`;

  return (
    <div className="metric-container">
      <div className="metric-header">
        <span className="metric-label">{label}</span>
        <span className="metric-value">{formattedText}</span>
      </div>
      <div className="metric-track">
        <div
          className="metric-fill"
          style={{ width: `${progressWidth}%` }}
        ></div>
      </div>
    </div>
  );
};

export default React.memo(MetricBar);
