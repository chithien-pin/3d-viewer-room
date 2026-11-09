import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command }) => ({
  // GitHub Pages serves the site under the repo name, not the domain root.
  base: command === "build" ? "/3d-viewer-room/" : "/",
  plugins: [react()],
  server: {
    port: 5173,
    host: "127.0.0.1",
  },
}));
