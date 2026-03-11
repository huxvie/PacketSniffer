import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  clearScreen: false, // tauri logs remain visible

  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          codemirror: [
            "@uiw/react-codemirror",
            "@codemirror/lang-json",
            "@codemirror/lang-html",
            "@codemirror/lang-xml",
            "@codemirror/lang-javascript",
            "@codemirror/language",
            "@codemirror/view",
            "@lezer/highlight",
          ],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },

  server: {
    port: 5173,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: "ws", host, port: 5174 } : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
});
