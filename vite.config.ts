import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
export default defineConfig({
  plugins: [react(), tailwind()],
  optimizeDeps: { include: ["tesseract.js"] },
  build: {
    rolldownOptions: {
      output: {
        assetFileNames: (asset) =>
          asset.names.includes("eng.traineddata.gz")
            ? "ocr/eng.traineddata.gz"
            : "assets/[name]-[hash][extname]",
      },
    },
  },
});
