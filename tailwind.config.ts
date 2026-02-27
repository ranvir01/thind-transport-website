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
          DEFAULT: "#001F3F",
          50: "#E6EBF0",
          100: "#C2D1E0",
          200: "#8BA3C1",
          300: "#5475A2",
          400: "#2D4D7A",
          500: "#001F3F",
          600: "#001933",
          700: "#001326",
          800: "#000D1A",
          900: "#00060D",
        },
        
        // Secondary: Safety Orange - Action, Energy, CTAs
        orange: {
          DEFAULT: "#FF9500",
          50: "#FFF5E6",
          100: "#FFE5BF",
          200: "#FFCC80",
          300: "#FFB340",
          400: "#FFA520",
          500: "#FF9500",
          600: "#E68600",
          700: "#CC7700",
          800: "#B36800",
          900: "#995900",
        },
        
        // Accent: Steel Gray - Professional, Industrial
        steel: {
          DEFAULT: "#4A4A4A",
          50: "#F5F5F5",
          100: "#E8E8E8",
          200: "#D1D1D1",
          300: "#B0B0B0",
          400: "#888888",
          500: "#4A4A4A",
          600: "#3D3D3D",
          700: "#2F2F2F",
          800: "#1F1F1F",
          900: "#121212",
        },

        // Legacy/Compatibility Aliases
        primary: {
          DEFAULT: "#001F3F",
          50: "#E6EBF0",
          100: "#C2D1E0",
          200: "#8BA3C1",
          300: "#5475A2",
          400: "#2D4D7A",
          500: "#001F3F",
          600: "#001933",
          700: "#001326",
          800: "#000D1A",
          900: "#00060D",
          950: "#001F3F",
        },
        secondary: {
          DEFAULT: "#FF9500",
          50: "#FFF5E6",
          100: "#FFE5BF",
          200: "#FFCC80",
          300: "#FFB340",
          400: "#FFA520",
          500: "#FF9500",
          600: "#E68600",
          700: "#CC7700",
          800: "#B36800",
          900: "#995900",
          950: "#FF9500",
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
      boxShadow: {
        'brand': '0 4px 14px 0 rgba(0, 31, 63, 0.15)',
        'brand-lg': '0 10px 40px 0 rgba(0, 31, 63, 0.2)',
        'cta': '0 8px 30px 0 rgba(255, 149, 0, 0.35)',
        'cta-hover': '0 12px 40px 0 rgba(255, 149, 0, 0.45)',
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
