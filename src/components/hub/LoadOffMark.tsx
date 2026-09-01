/**
 * The LoadOff mark, for app chrome — the same shape that ships as the installed
 * icon, drawn from the same path in lib/hub/brand.ts.
 *
 * The gradient is a CSS background on the tile rather than an SVG
 * `<linearGradient>` so this stays a server component with no client JS: an SVG
 * gradient needs a document-unique `id`, which means `useId`, which means
 * "use client" on every page that shows a logo. The tile is a plain element and
 * the SVG carries only the white glyph, so the mark renders identically with
 * nothing shipped to the browser.
 *
 * Fixed brand colours, not `--accent`: this is the product's mark and must look
 * the same under every tenant accent and in both modes, exactly as it does in
 * the PNG on the home screen. Office screens use semantic tokens for chrome —
 * that rule is about themeable UI, and a logo is not themeable UI.
 */
import { LOADOFF_BRAND, LOADOFF_ICON_RADIUS, LOADOFF_MARK_PATH, LOADOFF_MARK_VIEWBOX } from "@/lib/hub/brand"
import { cn } from "@/lib/utils"

export function LoadOffMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-flex shrink-0 items-center justify-center", className)}
      style={{
        width: size,
        height: size,
        borderRadius: size * LOADOFF_ICON_RADIUS,
        backgroundImage: `linear-gradient(150deg, ${LOADOFF_BRAND.indigo}, ${LOADOFF_BRAND.indigoDeep})`,
      }}
    >
      <svg width={size} height={size} viewBox={LOADOFF_MARK_VIEWBOX} fill="none">
        <path d={LOADOFF_MARK_PATH} fill={LOADOFF_BRAND.glyph} />
      </svg>
    </span>
  )
}
