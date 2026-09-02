import type { Config } from "tailwindcss"

/* ============================================================================
 * MARKETING DESIGN TOKENS — everything below is DERIVED, nothing is typed.
 *
 * Namespaced `m-*` on purpose. The hub (/hub) consumes the shared `fontSize`,
 * `borderRadius` and `boxShadow` names further down, and the redesign brief
 * scopes this work to the public marketing site — so mutating those values
 * would silently restyle the software. New namespace, zero blast radius.
 * A marketing component uses `text-m-h2`, `rounded-m-2`, `shadow-m-e3`.
 * ==========================================================================*/

/** Modular type scale: major third (1.250) from a 16px base.
 *  Chosen over 1.333 because the page is already far too tall — a perfect
 *  fourth would make every heading taller and worsen the real problem. */
const RATIO = 1.25
const step = (n: number) => Math.pow(RATIO, n) // in rem, base 1rem = 16px

/** Fluid interpolation between a 375px and a 1440px viewport.
 *  Returns a clamp() whose middle term is the line through
 *  (375px, min) and (1440px, max) — so size tracks viewport linearly
 *  between the bounds and is pinned outside them. */
const VW_MIN = 375
const VW_MAX = 1440
function fluid(minRem: number, maxRem: number): string {
  const minPx = minRem * 16
  const maxPx = maxRem * 16
  const slope = (maxPx - minPx) / (VW_MAX - VW_MIN)
  const interceptRem = (minPx - slope * VW_MIN) / 16
  const vw = slope * 100
  return `clamp(${minRem.toFixed(4)}rem, ${interceptRem.toFixed(4)}rem + ${vw.toFixed(4)}vw, ${maxRem.toFixed(4)}rem)`
}

/** Line height is inversely proportional to size: tight display, open body. */
const leading = (n: number) => (n >= 6 ? "1.05" : n >= 4 ? "1.1" : n >= 2 ? "1.2" : n === 1 ? "1.5" : "1.55")

/** How far a step compresses on mobile: the bigger the type, the more it
 *  gives back on a phone. Stated rule, not per-value taste. */
const compress = (n: number) => (n <= 1 ? 0 : n <= 4 ? 1 : 2)

/** One entry of the marketing type scale, fully derived from `n`. */
function typeStep(n: number): [string, { lineHeight: string; letterSpacing: string }] {
  const max = step(n)
  const min = step(n - compress(n))
  return [
    fluid(min, max),
    {
      lineHeight: leading(n),
      // Optical tracking: large type needs negative tracking to look even.
      letterSpacing: n >= 5 ? "-0.02em" : n >= 3 ? "-0.01em" : "0",
    },
  ]
}

/** Layered elevation, one light source directly above.
 *  Each level doubles offset and blur and adds one point of opacity —
 *  ambient (soft, wide) plus direct (tight, close), never a single blur. */
function elevation(k: number): string {
  const y = Math.pow(2, k - 1)
  // toFixed rather than string-concatenating the digit: `0.0${3+k}` silently
  // produces "0.010" once k reaches 7, which reads as a tenth of the opacity.
  const ambient = `0 ${y * 2}px ${y * 4}px rgba(20, 22, 24, ${(0.03 + k * 0.01).toFixed(3)})`
  const direct = `0 ${y}px ${y * 2}px rgba(20, 22, 24, ${(0.02 + k * 0.01).toFixed(3)})`
  return `${ambient}, ${direct}`
}

const config: Config = {
  // The hub stamps the mode as an attribute (boot script in app/hub/layout.tsx),
  // never as a class — `dark:` utilities now read the same attribute the CSS
  // tokens do. The marketing site has no mode toggle, so nothing fires there.
  darkMode: ["selector", '[data-mode="dark"]'],
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
          DEFAULT: "#121316",
          50: "#EDEDEE",
          100: "#D2D3D6",
          200: "#A9ABB0",
          300: "#7F8187",
          400: "#54565C",
          500: "#121316",
          600: "#0E0F12",
          700: "#0B0C0E",
          800: "#08090B",
          900: "#040405",
        },
        
        // Primary accent: Signal Red - action, urgency, brand energy
        orange: {
          DEFAULT: "#E0392F",
          50: "#FFF1F0",
          100: "#FFDAD7",
          200: "#FFB4AE",
          300: "#F8857C",
          400: "#EC5A50",
          500: "#E0392F",
          600: "#C42820",
          700: "#9E1D17",
          800: "#751512",
          900: "#4D0D0B",
        },

        // Complementary highlight: Hi-vis Gold - ratings, stats, accents that pair with red
        gold: {
          DEFAULT: "#F2A900",
          50: "#FFF9E8",
          100: "#FFEFC2",
          200: "#FFE08A",
          300: "#FFCD4D",
          400: "#F8BA1C",
          500: "#F2A900",
          600: "#C98700",
          700: "#9A6700",
          800: "#6E4900",
          900: "#452D00",
        },
        
        // Accent: Silver Steel - Professional, industrial contrast
        steel: {
          DEFAULT: "#ABADB2",
          50: "#F6F6F7",
          100: "#E9EAEB",
          200: "#D2D3D6",
          300: "#ABADB2",
          400: "#85878C",
          500: "#64666B",
          600: "#4C4E53",
          700: "#35373B",
          800: "#212226",
          900: "#141518",
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

        // HaulDesk software UI (CSS variable tokens — hub only)
        // ---- Marketing palette (see docs/design/DIRECTION.md §1) ----
        // Paper ground, graphite ink, one red. Dark is punctuation, not the page.
        // Every pair below is contrast-verified in DIRECTION.md.
        paper: "var(--m-paper)",
        ink: {
          DEFAULT: "var(--m-ink)",
          2: "var(--m-ink-2)",
          3: "var(--m-ink-3)",
        },
        signal: {
          DEFAULT: "var(--m-signal)",
          up: "var(--m-signal-up)",
        },
        asphalt: "var(--m-asphalt)",
        cedar: "var(--m-cedar)",

        bg: "var(--bg)",
        surface: { DEFAULT: "var(--surface)", 2: "var(--surface-2)", 3: "var(--surface-3)" },
        // `control` is the solid ≥3:1 edge for inputs/toggles (WCAG 1.4.11);
        // DEFAULT/strong are the whisper hairlines for cards and dividers.
        border: { DEFAULT: "var(--border)", strong: "var(--border-strong)", control: "var(--border-control)" },
        fg: { DEFAULT: "var(--text)", 2: "var(--text-2)", 3: "var(--text-3)" },
        hover: "var(--hover)",
        selected: "var(--selected)",
        overlay: "var(--overlay)",
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
          fg: "var(--accent-fg)",
          soft: "var(--accent-soft)",
          text: "var(--accent-text)",
        },
        ok: { DEFAULT: "var(--green)", soft: "var(--green-soft)" },
        warn: { DEFAULT: "var(--amber)", soft: "var(--amber-soft)" },
        bad: { DEFAULT: "var(--red)", soft: "var(--red-soft)", fg: "var(--bad-fg)" },
        info: { DEFAULT: "var(--blue)", soft: "var(--blue-soft)" },
        // Forced-dark surfaces (driver PWA, portal): their own ladder, set on
        // [data-surface="dark"] in hub-theme.css. Never mode-dependent.
        driver: {
          bg: "var(--driver-bg)",
          surface: "var(--driver-surface)",
          "surface-2": "var(--driver-surface-2)",
          border: "var(--driver-border)",
          "border-strong": "var(--driver-border-strong)",
          "border-control": "var(--driver-border-control)",
          text: "var(--driver-text)",
          "text-2": "var(--driver-text-2)",
          "text-3": "var(--driver-text-3)",
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

        // ---- Marketing scale: every value generated from RATIO, none typed ----
        "m-micro": typeStep(-1), // legal, disclaimers
        "m-body": typeStep(0),
        "m-lede": typeStep(1),
        "m-h4": typeStep(2),
        "m-h3": typeStep(3),
        "m-h2": typeStep(4),
        "m-h1": typeStep(5),
        "m-display": typeStep(6),
        "m-hero": typeStep(7),
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
        sans: ["var(--font-geist-sans)", "var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
        display: ["var(--font-display)", "Arial Narrow", "sans-serif"],
      },
      borderRadius: {
        fleet: "0.875rem",
        "fleet-lg": "1.5rem",
        // App radius ladder: control 10 (buttons/inputs) < card 14 (cards,
        // modals) < sheet 20 (large surfaces) < pill (full).
        card: "14px",
        control: "10px",
        sheet: "20px",
        pill: "20px",
        // Marketing: 4px × Fibonacci multipliers (1,2,3,5). Nested elements use
        // inner = outer − padding so corners stay concentric.
        "m-1": "4px",
        "m-2": "8px",
        "m-3": "12px",
        "m-4": "20px",
      },
      boxShadow: {
        card: "var(--shadow)",
        // Hub elevation ladder above cards (vars live in hub-theme.css).
        raised: "var(--shadow-raised)",
        overlay: "var(--shadow-overlay)",
        brand: "0 10px 34px rgba(0, 0, 0, 0.4)",
        "brand-lg": "0 24px 60px rgba(0, 0, 0, 0.5)",
        cta: "0 10px 30px rgba(224, 57, 47, 0.35)",
        "cta-hover": "0 16px 40px rgba(224, 57, 47, 0.5)",
        glow: "0 0 0 1px rgba(224,57,47,0.4), 0 0 40px rgba(224,57,47,0.25)",
        "glow-gold": "0 0 0 1px rgba(242,169,0,0.4), 0 0 40px rgba(242,169,0,0.22)",
        panel: "inset 0 1px 0 rgba(255, 255, 255, 0.06)",
        // Marketing elevation: 5 derived steps, one light source above.
        "m-e1": elevation(1),
        "m-e2": elevation(2),
        "m-e3": elevation(3),
        "m-e4": elevation(4),
        "m-e5": elevation(5),
      },
      transitionDuration: {
        // Motion ladder (M3-aligned): micro 120 / standard 220 / entrance 320.
        fast: "120ms",
        base: "200ms",
        standard: "220ms",
        slow: "320ms",
      },
      transitionTimingFunction: {
        // Named curves only — never bare `ease`. M3 set + the spring.
        entrance: "cubic-bezier(0.16, 1, 0.3, 1)",
        exit: "cubic-bezier(0.4, 0, 1, 1)",
        emphasis: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        standard: "cubic-bezier(0.2, 0, 0, 1)",
        decelerate: "cubic-bezier(0.05, 0.7, 0.1, 1)",
        accelerate: "cubic-bezier(0.3, 0, 0.8, 0.15)",
      },
      maxWidth: {
        // Measure, enforced in ch so it tracks the font, not a guessed px width.
        measure: "68ch",
        "measure-tight": "56ch",
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
        // Nav motion, replacing framer-motion's AnimatePresence. Entry only:
        // exit animation needs the element kept mounted after close, which is
        // not worth ~40KB of runtime on every page. Closing is instant.
        "dropdown-in": {
          from: { opacity: "0", transform: "translateY(8px) scale(0.96)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "drawer-in": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        "backdrop-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { transform: "translateY(20px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-12px)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "1" },
        },
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.5s ease-out",
        // Durations/easings from the motion tokens, not one-offs.
        "dropdown-in": "dropdown-in 120ms cubic-bezier(0.16, 1, 0.3, 1)",
        "drawer-in": "drawer-in 200ms cubic-bezier(0.16, 1, 0.3, 1)",
        "backdrop-in": "backdrop-in 200ms cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-up": "slide-up 0.6s ease-out",
        float: "float 6s ease-in-out infinite",
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

export default config
