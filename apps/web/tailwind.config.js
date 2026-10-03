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
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#20C878", // Vintha Mint Green
          foreground: "#FFFFFF",
          hover: "#18AA64",
          light: "#E8FAF1",
        },
        secondary: {
          DEFAULT: "#6D3AE8", // Vintha Purple
          foreground: "#FFFFFF",
          light: "#F0EBFC",
        },
        action: {
          DEFAULT: "#F23868", // Vintha Pink-Red
          foreground: "#FFFFFF",
          hover: "#D82250",
          light: "#FEECEF",
        },
        sidebar: {
          DEFAULT: "#121018", // Dark sidebar
          foreground: "#F4F4F5",
          border: "#23202E",
          active: "#20C878",
        },
        cream: "#FAFAF8",
        destructive: {
          DEFAULT: "#F23868",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "#F4F4F5",
          foreground: "#71717A",
        },
        accent: {
          DEFAULT: "#E8FAF1",
          foreground: "#0F766E",
        },
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#121018",
        },
      },
      borderRadius: {
        lg: "0.85rem",
        md: "0.65rem",
        sm: "0.45rem",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        heading: ["var(--font-outfit)", "sans-serif"],
      },
      boxShadow: {
        card: "0 2px 10px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.02)",
        subtle: "0 4px 20px rgba(0, 0, 0, 0.06)",
        float: "0 12px 36px rgba(0, 0, 0, 0.10)",
        greenGlow: "0 0 25px rgba(32, 200, 120, 0.35)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
