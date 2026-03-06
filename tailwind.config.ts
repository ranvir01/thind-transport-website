import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // ============================================
        // THIND TRANSPORT BRAND COLORS (Master Spec)
        // ============================================
        
        // Primary: Navy Blue - Trust, Authority, Stability
        navy: {
          DEFAULT: "#0B1422",
          50: "#E9EDF3",
          100: "#CCD6E3",
          200: "#A3B4C8",
          300: "#798DAA",
          400: "#516887",
          500: "#0B1422",
          600: "#09111C",
          700: "#070D16",
          800: "#050A11",
          900: "#03060A",
        },
        
        // Secondary: Crimson Red - Action, urgency, and hero accents
        orange: {
          DEFAULT: "#D94B45",
          50: "#FFF1F1",
          100: "#FFD9D7",
          200: "#FFB4B0",
          300: "#F78B84",
          400: "#EB655D",
          500: "#D94B45",
          600: "#C53C37",
          700: "#A92E2A",
          800: "#7D221F",
          900: "#561715",
        },
        
        // Accent: Silver Steel - Professional, industrial contrast
        steel: {
          DEFAULT: "#A7B0BD",
          50: "#F5F7FA",
          100: "#E6EBF1",
          200: "#CDD5DF",
          300: "#A7B0BD",
          400: "#828C98",
          500: "#626C79",
          600: "#4B5563",
          700: "#343D4A",
          800: "#202733",
          900: "#131922",
        },

        // Legacy/Compatibility Aliases
        primary: {
          DEFAULT: "#0B1422",
          50: "#E9EDF3",
          100: "#CCD6E3",
          200: "#A3B4C8",
          300: "#798DAA",
          400: "#516887",
          500: "#0B1422",
          600: "#09111C",
          700: "#070D16",
          800: "#050A11",
          900: "#03060A",
          950: "#0B1422",
        },
        secondary: {
          DEFAULT: "#D94B45",
          50: "#FFF1F1",
          100: "#FFD9D7",
          200: "#FFB4B0",
          300: "#F78B84",
          400: "#EB655D",
          500: "#D94B45",
          600: "#C53C37",
          700: "#A92E2A",
          800: "#7D221F",
          900: "#561715",
          950: "#D94B45",
        },
        
        // Neutral Color Palette
        neutral: {
          50: "#f9fafb",
          100: "#f3f4f6",
          200: "#e5e7eb",
          300: "#d1d5db",
          400: "#9ca3af",
          500: "#6b7280",
          600: "#4b5563",
          700: "#374151",
          800: "#1f2937",
          900: "#111827",
          950: "#030712",
        },
        
        // Semantic Colors
        success: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
          950: "#052e16",
        },
        warning: {
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
          950: "#451a03",
        },
        error: {
          50: "#fef2f2",
          100: "#fee2e2",
          200: "#fecaca",
          300: "#fca5a5",
          400: "#f87171",
          500: "#ef4444",
          600: "#dc2626",
          700: "#b91c1c",
          800: "#991b1b",
          900: "#7f1d1d",
          950: "#450a0a",
        },
      },
      fontSize: {
        // Mobile-first typography (min 16px body)
        "display-2xl": ["4.5rem", { lineHeight: "1", letterSpacing: "-0.02em", fontWeight: "900" }],
        "display-xl": ["3.75rem", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "900" }],
        "display-lg": ["3rem", { lineHeight: "1.2", letterSpacing: "-0.01em", fontWeight: "800" }],
        "display-md": ["2.25rem", { lineHeight: "1.3", letterSpacing: "-0.01em", fontWeight: "700" }],
        "display-sm": ["1.875rem", { lineHeight: "1.4", letterSpacing: "0", fontWeight: "700" }],
        "h1": ["2.5rem", { lineHeight: "1.2", letterSpacing: "-0.01em", fontWeight: "800" }],
        "h2": ["2rem", { lineHeight: "1.3", letterSpacing: "-0.01em", fontWeight: "700" }],
        "h3": ["1.5rem", { lineHeight: "1.4", letterSpacing: "0", fontWeight: "700" }],
        "h4": ["1.25rem", { lineHeight: "1.5", letterSpacing: "0", fontWeight: "600" }],
        "h5": ["1.125rem", { lineHeight: "1.5", letterSpacing: "0", fontWeight: "600" }],
        "h6": ["1rem", { lineHeight: "1.5", letterSpacing: "0", fontWeight: "600" }],
        "body-lg": ["1.125rem", { lineHeight: "1.75", letterSpacing: "0", fontWeight: "400" }],
        "body": ["1rem", { lineHeight: "1.75", letterSpacing: "0", fontWeight: "400" }],
        "body-sm": ["0.875rem", { lineHeight: "1.5", letterSpacing: "0", fontWeight: "400" }],
        "body-xs": ["0.75rem", { lineHeight: "1.5", letterSpacing: "0", fontWeight: "400" }],
        "label-lg": ["0.875rem", { lineHeight: "1.5", letterSpacing: "0.01em", fontWeight: "600" }],
        "label": ["0.75rem", { lineHeight: "1.5", letterSpacing: "0.01em", fontWeight: "600" }],
        "label-sm": ["0.625rem", { lineHeight: "1.5", letterSpacing: "0.02em", fontWeight: "600" }],
      },
      fontWeight: {
        thin: "100",
        extralight: "200",
        light: "300",
        normal: "400",
        medium: "500",
        semibold: "600",
        bold: "700",
        extrabold: "800",
        black: "900",
      },
      fontFamily: {
        sans: ["var(--font-rajdhani)", "system-ui", "sans-serif"],
        display: ["var(--font-teko)", "Arial Narrow", "sans-serif"],
      },
      boxShadow: {
        'brand': '0 10px 30px rgba(3, 6, 10, 0.28)',
        'brand-lg': '0 20px 60px rgba(3, 6, 10, 0.38)',
        'cta': '0 12px 36px rgba(217, 75, 69, 0.32)',
        'cta-hover': '0 18px 44px rgba(217, 75, 69, 0.42)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { transform: "translateY(20px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.5s ease-out",
        "slide-up": "slide-up 0.6s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

export default config
