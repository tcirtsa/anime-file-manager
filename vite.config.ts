import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@tauri-apps/api': resolve(__dirname, 'node_modules/@tauri-apps/api')
    }
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  clearScreen: false,
  // tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420, // 使用1420端口
    strictPort: true, // 强制使用指定端口，如果被占用则报错
  },
  // to access the Tauri environment variables set by the CLI with process.env.VARIABLE_NAME
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    // Tauri supports es2021
    target: ["es2021", "chrome100", "safari13"],
    // don't minify for debug builds
    minify: process.env.TAURI_DEBUG ? false : "esbuild",
    // produce sourcemaps for debug builds
    sourcemap: !!process.env.TAURI_DEBUG,
  },
});
