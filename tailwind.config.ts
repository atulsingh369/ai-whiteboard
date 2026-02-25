import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          app: "#030712", // Layer 0: Deep void
          1: "rgba(17, 24, 39, 0.7)", // Layer 1: Glass panels (backdrop-blur applied via utility)
          2: "#1F2937", // Layer 2: Interactive surfaces
          3: "#374151", // Layer 3: Hover states
        },
        border: {
          subtle: "rgba(255, 255, 255, 0.08)",
          strong: "rgba(255, 255, 255, 0.15)",
        },
        txt: {
          primary: "#F9FAFB",
          secondary: "#9CA3AF",
          muted: "#6B7280",
        },
        accent: {
          DEFAULT: "#0EA5E9", // Electric Cyan
          hover: "#0284C7",
          glow: "rgba(14, 165, 233, 0.15)",
          violet: "#8B5CF6", // AI processing glow
        },
      },
      backgroundImage: {
        "hero-glow":
          "radial-gradient(circle at 50% 0%, rgba(14, 165, 233, 0.15) 0%, transparent 50%)",
        "luminous-grid":
          "linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px)",
        "vignette-radial":
          "radial-gradient(circle at center, transparent 30%, #030712 100%)",
        "ai-glow":
          "radial-gradient(circle at 50% 0%, rgba(139, 92, 246, 0.15) 0%, transparent 60%)",
      },
      backgroundSize: {
        "grid-24": "24px 24px",
      },
      boxShadow: {
        "card-elevation":
          "0 20px 40px -10px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255,255,255,0.08)",
      },
      transitionDuration: {
        sidebar: "200ms",
      },
      width: {
        "sidebar-left": "280px",
        "sidebar-right": "360px",
        "sidebar-collapsed": "0px",
      },
    },
  },
  darkMode: "class",
  plugins: [],
};

export default config;
