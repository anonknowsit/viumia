import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Tauri doesn't need a full CSP, but keep it for safety
  clearScreen: false,
  // Tauri uses a custom dev server URL
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      // Tell Vite to not watch the Rust backend
      ignored: ['**/src-tauri/**'],
    },
  },
  build: {
    target: ['es2021', 'chrome100', 'safari13'],
  },
})
