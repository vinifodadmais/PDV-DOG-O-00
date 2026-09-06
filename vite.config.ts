import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Espelha o path "@/*" do tsconfig.app.json, mas para o Vite
      // conseguir resolver de verdade em tempo de build/dev — o
      // tsconfig sozinho só serve para a checagem de tipos, não para
      // o bundler.
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});
