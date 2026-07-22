import { type ClassValue, clsx } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/**
 * Custom font-size utilities defined in tailwind.config.ts (`theme.extend.fontSize`).
 * tailwind-merge does not know these `text-*` names are font-sizes, so by default
 * it lumps e.g. `text-label` into the same conflict bucket as `text-neutral-700`
 * and drops one of them — silently stripping the COLOR off every component that
 * combines a size token with a color (Label, Button, CardDescription, …). On the
 * dark marketing pages the stripped label then inherited the near-white body
 * color and looked fine; on any light card/section it rendered invisible.
 * Registering them in the font-size group keeps size and color as independent
 * concerns, the way Tailwind already treats `text-sm text-gray-900`.
 */
const FONT_SIZE_TOKENS = [
  "display-2xl", "display-xl", "display-lg", "display-md", "display-sm",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "body-lg", "body", "body-sm", "body-xs",
  "label-lg", "label", "label-sm",
]

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: FONT_SIZE_TOKENS }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
