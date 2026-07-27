import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0a0a0a",
        charcoal: "#141414",
        charcoal2: "#1c1c1c",
        line: "#2a2a2a",
        orange: {
          DEFAULT: "#ff6d01",
          dim: "#c85601",
        },
        blue: {
          DEFAULT: "#0422b6",
        },
        skyline: "#3ebbff",
        bone: "#f2f0ec",
      },
      fontFamily: {
        display: ["Oswald", "sans-serif"],
        body: ["Inter", "sans-serif"],
        script: ["Caveat", "cursive"],
      },
      letterSpacing: {
        tightest: "-0.04em",
      },
    },
  },
  plugins: [],
} satisfies Config;
