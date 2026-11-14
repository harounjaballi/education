import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          50: "#EEF2F8",
          100: "#D5DEEC",
          200: "#A9BBD8",
          300: "#7896C0",
          400: "#4A6FA3",
          500: "#2C5185",
          600: "#1E3D69",
          700: "#152E52",
          800: "#0E213D",
          900: "#0A1A31",
          950: "#06111F",
        },
        teal: {
          50: "#EFFCF9",
          100: "#CFF6EE",
          200: "#9FEDDD",
          300: "#66DDC8",
          400: "#33C4AE",
          500: "#14A896",
          600: "#0E877A",
          700: "#106C63",
          800: "#125650",
          900: "#134843",
        },
        surface: "#F4F6FC",
        // Couleur de l'espace courant (admin, enseignant, élève) : variables CSS dans globals.css.
        brand: {
          DEFAULT: "rgb(var(--brand) / <alpha-value>)",
          2: "rgb(var(--brand-2) / <alpha-value>)",
          soft: "rgb(var(--brand-soft) / <alpha-value>)",
          ink: "rgb(var(--brand-ink) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "system-ui", "sans-serif"],
        arabic: ["var(--font-arabic)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(10,26,49,0.04), 0 4px 16px -4px rgba(10,26,49,0.06)",
        lift: "0 2px 4px rgba(10,26,49,0.05), 0 12px 32px -8px rgba(10,26,49,0.12)",
      },
      borderRadius: { xl: "0.875rem", "2xl": "1.125rem" },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: { "fade-up": "fade-up 0.35s ease-out both" },
    },
  },
  plugins: [],
} satisfies Config;
