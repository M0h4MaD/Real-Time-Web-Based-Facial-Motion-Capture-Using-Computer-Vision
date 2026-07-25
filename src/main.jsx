// File: src/main.jsx
// Description: Application entry point. Boots React, wraps the root <App>
// in <StrictMode> for development-time checks, and mounts it into the
// #root DOM element.

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Mount the React application into the #root DOM element
// StrictMode enables additional development-time checks and warnings
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)