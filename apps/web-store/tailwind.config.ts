import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        stitch: {
          night: "#111111",
          surface: "#1C1C1C",
          lift: "#242424",
          border: "#2A2A2A",
          border2: "#333333",
          parchment: "#F0EDE6",
          ash: "#9E9B95",
          smoke: "#5A5855",
          linen: "#E8E4DC",
        },
      },
      fontFamily: {
        display: ["Serenata", "Georgia", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        "widest-2": "0.16em",
        "widest-3": "0.20em",
      },
      fontSize: {
        hero: [
          "clamp(48px, 8vw, 96px)",
          { lineHeight: "1.05", letterSpacing: "-0.02em" },
        ],
        "hero-sm": [
          "clamp(32px, 5vw, 56px)",
          { lineHeight: "1.1", letterSpacing: "-0.015em" },
        ],
        label: ["11px", { lineHeight: "1.4", letterSpacing: "0.12em" }],
      },
      transitionTimingFunction: {
        stitch: "cubic-bezier(0.25, 0.1, 0.25, 1)",
      },
      transitionDuration: {
        "400": "400ms",
        "600": "600ms",
        "800": "800ms",
      },
    },
  },
  plugins: [
    function ({ addUtilities }: any) {
      addUtilities({
        ".transform-style-3d": {
          "transform-style": "preserve-3d",
        },
        ".backface-hidden": {
          "backface-visibility": "hidden",
        },
      });
    },
  ],
};

export default config;
