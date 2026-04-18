import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// GitHub Pages: set base to '/fa-system-web/' (your repo name)
// For local dev: base is '/'
const isGHPages = process.env.GITHUB_PAGES === 'true';

export default defineConfig({
  base: isGHPages ? '/fa-system-web/' : '/',
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
});
