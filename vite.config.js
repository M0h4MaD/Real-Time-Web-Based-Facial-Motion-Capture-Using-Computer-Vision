import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // 🔥 هذا السطر يحل المشكلة جذرياً
    'process.env': {} 
  },
   worker: {
    format: "es", // ⚡ critical for dynamic import() inside workers to resolve correctly
  },
  optimizeDeps: {
    exclude: ["@mediapipe/tasks-vision"], // ⚡ stops Vite from pre-bundling/transforming the wasm glue
  },
})
