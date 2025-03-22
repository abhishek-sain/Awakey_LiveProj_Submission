import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    strictPort: true,
    allowedHosts: ["awakey-liveproj-submission.onrender.com"], // ✅ Allowed host added
    hmr: {
      protocol: "wss",
      host: "awakey-liveproj-submission.onrender.com",
      clientPort: 443,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
