# 🎭 MocapAvatar — Real-Time Face Tracking & 3D Avatar Animation

> A high-performance web application that turns your webcam into a motion-capture studio. Track your face in real-time with **MediaPipe**, drive a **3D avatar** with blendshapes & bone animation, and export your performance as JSON keyframes or WEBM video.

<p align="center">
  <img src="./src/assets/hero.png" alt="MocapAvatar Demo" width="720" />
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#demo">Demo</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#usage">Usage</a> •
  <a href="#recording">Recording</a>
</p>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🎯 **Real-Time Face Tracking** | 478-point facial landmark detection powered by **MediaPipe FaceLandmarker** with GPU acceleration |
| 🧬 **Blendshape Animation** | Automatically maps facial expressions (blink, mouth open, joy, sad, pucker, brows) to any GLB model's morph targets |
| 🦴 **Head Pose Estimation** | Live yaw, pitch, and roll rotation extracted from facial geometry and applied to the model's head bone |
| 💨 **Hair Physics** | Spring-based physics simulation on hair bones driven by head rotation velocity — FPS-independent |
| 🖥️ **3D Model Viewer** | Load custom `.glb` models (up to 50MB) with OrbitControls, shadows, and HDRI environment lighting |
| 📊 **Live HUD** | Collapsible sidebar with real-time metric bars, FPS/memory monitoring, and blendshape inspector |
| 🎨 **Landmark Overlays** | 7 visualization modes: Points, Wireframe, Mouth, Eyes, Cyberpunk scanner, and more |
| 📹 **Recording System** | Export motion-capture data as **JSON keyframes** or capture **WEBM video + microphone audio** |
| 🎛️ **Performance Settings** | Adjustable camera resolution, tracking FPS, pixel ratio, antialiasing, shadows, and HDRI |
| 🟢 **Green Screen** | One-click chroma key background for easy compositing |
| 🪞 **Mirror Mode** | Flip tracking direction for mirrored or direct control |
| 🧹 **Memory Management** | Built-in cache clearing, geometry disposal, and RAM protection during recording |

---

## 🚀 Demo

```bash
# Clone the repository
git clone <repo-url>
cd mid-project

# Install dependencies
npm install

# Start the development server
npm run dev
```

Then open your browser to `http://localhost:5173`, allow camera access, and click **"Start Tracking"**.

> **Note:** The MediaPipe bundle is built automatically before dev/build via the `predev` / `prebuild` hooks.

---

## 🛠️ Tech Stack

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Three.js-r185-black?logo=three.js&logoColor=white" alt="Three.js" />
  <img src="https://img.shields.io/badge/MediaPipe-0.10-FF6F00?logo=google&logoColor=white" alt="MediaPipe" />
  <img src="https://img.shields.io/badge/Zustand-5-FFD700?logo=react&logoColor=white" alt="Zustand" />
  <img src="https://img.shields.io/badge/ESM-Module-blue" alt="ES Modules" />
</p>

- **[React 19](https://react.dev/)** — UI framework with StrictMode
- **[Vite 8](https://vitejs.dev/)** — Lightning-fast dev server and bundler
- **[Three.js](https://threejs.org/) + [@react-three/fiber](https://docs.pmndrs.react-three-fiber.org/)** — WebGL 3D rendering
- **[@react-three/drei](https://github.com/pmndrs/drei)** — Stage, OrbitControls, Center, GLTF loading
- **[MediaPipe Tasks Vision](https://developers.google.com/mediapipe/solutions/vision/face_landmarker)** — Face landmark detection (GPU delegate)
- **[Zustand](https://github.com/pmndrs/zustand)** — Lightweight state management
- **[react-rnd](https://github.com/bokuweb/react-rnd)** — Draggable & resizable overlay window
- **[react-hot-toast](https://react-hot-toast.com/)** — Toast notifications (Arabic & English supported)
- **Web Workers** — Off-main-thread landmark detection for 60fps rendering

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BROWSER (Main Thread)                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   Webcam     │  │   Canvas     │  │    HUD       │  │  Tracking Overlay│  │
│  │   <video>    │  │   (r3f)      │  │  (Sidebar)   │  │   (react-rnd)    │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┘  └────────┬─────────┘  │
│         │                 │                                      │            │
│         ▼                 ▼                                      ▼            │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    Zustand Stores (globalStates.js)                   │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐   │   │
│  │  │ useFaceStore│  │ useUIStore  │  │      useTrackingStore       │   │   │
│  │  │  metrics    │  │  settings   │  │      isTracking flag        │   │   │
│  │  │  landmarks  │  │  toggles    │  │                             │   │   │
│  │  │ calibration │  │  toasts     │  │                             │   │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│         │                              ▲                                    │
│         │  (ImageBitmap, Transferable) │                                    │
│         ▼                              │                                    │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │              faceLandmarker.worker.js  (Web Worker)                   │   │
│  │  ┌─────────────────┐      ┌───────────────────────────────────────┐  │   │
│  │  │  FaceLandmarker │  →   │  Flat Float32Array (478 × 3)          │  │   │
│  │  │  (GPU Delegate) │      │  Zero-copy Transferable               │  │   │
│  │  └─────────────────┘      └───────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                        FaceCalculations.js                            │   │
│  │  Yaw / Pitch / Roll  →  EAR Blink  →  Mouth Open  →  Expressions      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                        ModelViewer.jsx (r3f)                          │   │
│  │  Head Bone Rotation  →  Blendshape Morphs  →  Hair Physics            │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

1. **Web Worker Offloading** — MediaPipe FaceLandmarker runs in a dedicated worker to keep the main thread free for 60fps rendering. Landmark data is transferred as a flat `Float32Array` (zero-copy).
2. **FPS-Independent Animation** — All smoothing, hair physics, and blendshape lerping are normalized to a 60fps reference delta. Motion feels identical regardless of tracking FPS (15–60).
3. **Smart Filter** — Time-corrected exponential smoothing with pitch damping during large yaw turns prevents axis cross-talk and jitter.
4. **Memory Safety** — Automatic geometry/material disposal on model swap, blob URL revocation, and an 18,000-frame RAM cap during recording.
5. **Custom esbuild Bundle** — MediaPipe's vision bundle is pre-bundled into an IIFE (`public/mediapipe-vision-bundle.js`) to resolve Vite/WASM compatibility issues.

---

## 📁 Project Structure

```
mid-project/
├── public/
│   ├── Adam.glb                          # Default 3D avatar model
│   ├── face_landmarker.task              # MediaPipe model weights
│   ├── mediapipe-vision-bundle.js        # Pre-bundled MediaPipe IIFE (auto-generated)
│   ├── wasm/
│   │   ├── vision_wasm_internal.js       # MediaPipe WASM glue
│   │   ├── vision_wasm_internal.wasm     # MediaPipe WASM binary
│   │   └── vision_wasm_nosimd_internal.wasm
│   └── favicon.svg
│
├── scripts/
│   └── build-mediapipe-bundle.mjs        # esbuild script for MediaPipe bundling
│
├── src/
│   ├── App.jsx                           # Root component (Canvas, Stage, UI overlays)
│   ├── main.jsx                          # React entry point
│   ├── index.css                         # Global styles
│   ├── App.css                           # Root layout styles
│   │
│   ├── Components/
│   │   ├── ModelViewer.jsx               # 3D model renderer, bone/blendshape driver
│   │   ├── FaceTracker.jsx               # Camera capture & worker communication loop
│   │   ├── TrackingOverlay.jsx           # Draggable video window (react-rnd)
│   │   ├── LandmarksOverlay.jsx          # 2D canvas landmark visualization
│   │   ├── HUD.jsx                       # Collapsible control panel sidebar
│   │   ├── SettingsPanel.jsx             # Floating performance settings widget
│   │   ├── MetricBar.jsx                 # Live metric progress bars
│   │   ├── ModelDataInspector.jsx        # Blendshape list inspector
│   │   ├── CalibrateButton.jsx           # Face calibration trigger
│   │   ├── hooks/
│   │   │   └── usePerformanceMonitor.js  # FPS & memory monitoring hook
│   │   └── styles/
│   │       ├── HUD.css
│   │       ├── TrackingOverlay.css
│   │       ├── MetricBar.css
│   │       └── SettingsPanel.css
│   │
│   ├── lib/
│   │   ├── globalStates.js               # Zustand stores (face, UI, tracking)
│   │   ├── FaceCalculations.js           # Landmark → metrics math (EAR, angles, expressions)
│   │   ├── faceLandmarker.worker.js      # Web Worker: MediaPipe detection
│   │   ├── hairPhysicsEngine.js          # Spring-based hair bone physics
│   │   └── recorder.js                   # JSON keyframe & WEBM recording subsystem
│   │
│   └── assets/
│       └── hero.png
│
├── vite.config.js                        # Vite config (worker ES format, MediaPipe exclusion)
├── eslint.config.js                      # ESLint flat config
├── package.json
└── README.md
```

---

## 🎮 Usage

### Starting Tracking
1. Click **"Start Tracking"** in the bottom-left floating button.
2. Allow camera access when prompted.
3. A draggable video window appears — position it anywhere on screen.
4. Your face movements are now driving the 3D avatar in real-time!

### Calibration
1. Look straight at the camera with a **neutral expression**.
2. Click **"Calibrate"** in the HUD panel.
3. The button turns green (✓ Calibrated) when complete.
4. Calibration captures your personal baseline for EAR, mouth dimensions, brow distances, and head angles — dramatically improving tracking accuracy.

### Loading a Custom Model
1. Click **"📁 Load Model"** in the HUD.
2. Select a `.glb` file (up to 50MB).
3. The model loads with auto-discovery of all blendshapes and head/hair bones.
4. Use the **Model Blendshapes** inspector to see what shapes were detected.

> **Model Requirements:** The avatar should have:
> - A bone named `*head*` (drives head rotation)
> - Bones named `J_Sec_Hair*` (for hair physics)
> - Blendshape/morph targets (for facial expression mapping)

### Landmark Overlay Modes
Choose from the dropdown in the HUD:
- **🚫 OFF** — No overlay
- **🟢 Points + Wireframe** — Full landmarks with connections
- **🕸️ Just Wireframe** — Connections only
- **📍 Just Points** — Landmark dots only
- **👄 Mouth Only** — Mouth region focus
- **👁️ Eyes Only** — Eye region focus
- **⚡ Cyberpunk Scanner** — Neon glow wireframe effect

---

## 📹 Recording

### JSON Keyframes (Motion Capture Data)
1. Select **"JSON (Mocap)"** from the record mode dropdown.
2. Click **"Record ⏺"**.
3. Perform your facial animation.
4. Click **"Stop REC ⏹"** — the `.json` file auto-downloads.
5. The JSON contains timestamped frames of all metrics (yaw, pitch, roll, blink, mouth, expressions).

### WEBM Video (Screen + Microphone)
1. Select **"WEBM (Video + Mic)"** from the record mode dropdown.
2. Click **"Record ⏺"** — allow microphone access.
3. The 3D canvas + your voice are recorded.
4. Click **"Stop REC ⏹"** — the `.webm` file auto-downloads.

> **Safety:** JSON recording auto-stops after 18,000 frames (~3 minutes at 60fps) to prevent OOM crashes.

---

## ⚙️ Performance Settings

Click the **⚙️** gear icon in the top-left to access:

| Setting | Options | Effect |
|---------|---------|--------|
| 📹 Camera Resolution | 320×240 / 640×480 / 1280×720 | Higher = more detail, more CPU |
| 🎯 Tracking FPS | 15 / 20 / 25 / 30 / 60 | Lower = less CPU, smoother feel if under load |
| 🖥️ Render Quality | 0.5× – 2.0× | Pixel ratio for sharpness vs. performance |
| 💨 Hair Physics | On / Off | Spring simulation on hair bones |
| 🌍 HDRI Environment | On / Off | City HDRI lighting for realism |
| ✨ Antialiasing | On / Off | MSAA edge smoothing |
| 🌑 Shadows | On / Off | Real-time shadow casting |
| 🧹 Clear Cache | Button | Purges THREE.js texture/material cache |

---

## 🔧 Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (auto-builds MediaPipe bundle first) |
| `npm run build` | Production build (auto-builds MediaPipe bundle first) |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |
| `npm run build:mediapipe` | Manually build the MediaPipe IIFE bundle |

---

## 🌐 Browser Compatibility

| Browser | Status | Notes |
|---------|--------|-------|
| Chrome | ✅ Fully Supported | Best performance with GPU delegate |
| Edge | ✅ Fully Supported | Chromium-based |
| Firefox | ⚠️ Partial | MediaPipe GPU delegate may fall back to CPU |
| Safari | ⚠️ Partial | Check WebGL 2.0 & WASM support |

**Requirements:**
- WebGL 2.0
- Web Workers
- `getUserMedia` (camera)
- `createImageBitmap`
- `OffscreenCanvas` (for worker)

---

## 🧠 How It Works

### 1. Face Detection (Web Worker)
The webcam feed is captured at the configured resolution and downscaled via `createImageBitmap` before being sent to the FaceLandmarker worker. The worker returns a flat `Float32Array` of 1,434 numbers (478 landmarks × 3 coordinates) — transferred zero-copy to avoid GC pressure.

### 2. Metric Extraction
`FaceCalculations.js` converts raw landmarks into animation-ready metrics:
- **Head Pose:** `atan2`-based yaw, pitch, and roll from cheek/nose geometry
- **Blink:** Eye Aspect Ratio (EAR) with pitch-compensated attack/release smoothing
- **Mouth:** Normalized inner-mouth height with deadzone suppression
- **Expressions:** Joy, sad, pucker, brow surprised, and angry from relative distances
- **Calibration Baseline:** Personalized neutral-face reference values

### 3. Animation (Main Thread, 60fps)
`ModelViewer.jsx` runs in `useFrame` every render tick:
- **Head Bone:** Lerp-rotated by yaw/pitch/roll with FPS-independent smoothing
- **Blendshapes:** Morphed by expression values with mouth-specific multipliers
- **Hair Bones:** Spring physics react to head angular velocity (inertia → stiffness → damping)

### 4. Smart Filtering
A time-corrected exponential filter smooths head rotations. When yaw exceeds 0.25 rad, pitch damping kicks in to prevent the "looking down while turning" cross-talk artifact.

---

## 📝 License

MIT © 2025

---

<p align="center">
  Built with ❤️ using React, Three.js & MediaPipe
</p>
