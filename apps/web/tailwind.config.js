/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        s2p: {
          dark: "#090d0b",
          charcoal: "#111827",
          panel: "#161e1b",
          border: "#24322c",
          emerald: {
            DEFAULT: "#059669",
            hover: "#047857",
            light: "#ecfdf5",
            bright: "#10b981",
          }
        },
        primary: {
          DEFAULT: "#059669", // S2P Emerald
          foreground: "#FFFFFF",
          hover: "#047857",
          light: "#ecfdf5",
          bright: "#10b981"
        },
        sidebar: {
          DEFAULT: "#0b0f0e",
          foreground: "#F4F4F5",
          border: "#1c2621",
          active: "#10b981",
        }
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.375rem",
      },
      boxShadow: {
        card: "0 2px 10px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.02)",
        emeraldGlow: "0 0 25px rgba(16, 185, 129, 0.35)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
