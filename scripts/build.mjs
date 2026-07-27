import { build } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "tailwindcss";
import autoprefixer from "autoprefixer";

await build({
  configFile: false,
  root: process.cwd(),
  plugins: [react()],
  css: {
    postcss: {
      plugins: [tailwind({ config: "tailwind.config.ts" }), autoprefixer()],
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
