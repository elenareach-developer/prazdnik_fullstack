import { fileURLToPath } from "node:url";
import { defineConfig, searchForWorkspaceRoot } from "vite";
import react from "@vitejs/plugin-react";

// Shared Sakura theme lives in frontend/shared (outside this app's root).
const sharedDir = fileURLToPath(new URL("../shared", import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: { dedupe: ["react", "react-dom"] },
  server: {
    port: 5174,
    fs: { allow: [searchForWorkspaceRoot(process.cwd()), sharedDir] },
  },
});
