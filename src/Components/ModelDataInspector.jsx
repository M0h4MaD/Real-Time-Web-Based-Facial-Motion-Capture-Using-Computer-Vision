// File: src/Components/ModelDataInspector.jsx
// Description: Collapsible panel listing the blendshapes available on the
// currently loaded model, read from the UI store.

import { useState } from "react";
import { useUIStore } from "../lib/globalStates.js";

export default function ModelDataInspector() {
  const modelBlendshapes = useUIStore((state) => state.modelBlendshapes);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="model-inspector-container">
      <button className="inspector-btn" onClick={() => setIsOpen(!isOpen)}>
        <span>📦 Model Blendshapes ({modelBlendshapes.length})</span>
        <span>{isOpen ? "▼" : "▶"}</span>
      </button>

      {isOpen && (
        <div className="inspector-content">
          {modelBlendshapes.length === 0 ? (
            <div className="inspector-empty">
              لا يوجد Blendshapes في هذا المجسم!
            </div>
          ) : (
            modelBlendshapes.map((shapeName, index) => (
              <div key={index} className="inspector-item">
                <span className="inspector-item-name">{index + 1}. {shapeName}</span>
                <span className="inspector-item-status">READY</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}