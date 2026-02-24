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
          app: "#0B1220", // Level 0: Background Base
          1: "#111827", // Level 1: Sidebar / Panels
          2: "#1A2234", // Level 2: Cards / Floating toolbars
          3: "#243041", // Level 3: Modals / Hover states
        },
        border: {
          subtle: "rgba(255,255,255,0.06)",
        },
        txt: {
          primary: "#FFFFFF",
          secondary: "#9CA3AF",
          muted: "#6B7280",
        },
        accent: {
          DEFAULT: "#3B82F6", // Primary Blue
          hover: "#2563EB", // Hover Blue
        },
      },
      backgroundImage: {
        "hero-glow":
          "radial-gradient(circle at 0% 50%, rgba(37, 99, 235, 0.15) 0%, transparent 60%)",
        "canvas-glow":
          "radial-gradient(circle at 50% 50%, rgba(37, 99, 235, 0.08) 0%, transparent 70%)",
      },
      boxShadow: {
        "card-elevation":
          "0 20px 40px rgba(0, 0, 0, 0.6), 0 0 60px -15px rgba(37, 99, 235, 0.1)", // Level 3 Modals
        "toolbar-elevation":
          "0 8px 30px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255,255,255,0.06)", // Level 2 Floating
        "panel-elevation": "10px 0 30px rgba(0, 0, 0, 0.3)", // Level 1 Sidebar (Left/Right depending on placement)
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
