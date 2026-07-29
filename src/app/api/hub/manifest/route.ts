/**
 * Per-tenant PWA manifest (Phase 7 branding). Lives under /api/hub (not
 * /hub) so src/proxy.ts's `/hub/:path*` auth gate never intercepts it — the
 * browser must be able to fetch a manifest before a session exists.
 */
import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { getHubUser } from "@/lib/hub/session"
import { getCarrierSettings } from "@/lib/hub/settings"
import { PRODUCT } from "@/lib/hub/product"
import { manifestScope } from "@/lib/hub/install-scope"

/** Same background/theme as the static fallback (public/hub.webmanifest). */
const DEFAULT_THEME_COLOR = "#0E1621"
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/

/**
 * Theme/background color follow the signed-in owner's
 * carrier_settings.branding.accent, same source PDFs already read (pdf.ts).
 * Falls back to the neutral default for signed-out installs and
 * platform_admin (no carrier scope).
 */
export async function resolveManifestThemeColor(): Promise<string> {
  const user = await getHubUser()
  if (!user?.carrierId) return DEFAULT_THEME_COLOR
  const settings = await getCarrierSettings(user.carrierId)
  const accent = settings.branding.accent
  return accent && HEX_COLOR.test(accent) ? accent : DEFAULT_THEME_COLOR
}

export async function buildManifest(userAgent?: string | null) {
  const themeColor = await resolveManifestThemeColor()
  return {
    name: PRODUCT.name,
    short_name: PRODUCT.shortName,
    description:
      "Dispatch, money, compliance, and driver tools for small and mid-size trucking carriers — all in one place.",
    // `id` pins the app's identity independently of start_url and scope, so the
    // install is the SAME app whether it started from /hub/get-app or from an
    // install page on the marketing side — one icon, not two.
    id: "/hub",
    start_url: "/hub",
    // Widened to "/" for iOS only, so Add to Home Screen on an install page
    // outside /hub still resolves to LoadOff. See lib/hub/install-scope.ts.
    scope: manifestScope(userAgent),
    display: "standalone",
    background_color: themeColor,
    theme_color: themeColor,
    icons: [
      { src: "/hub-icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/hub-icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/hub-icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }
}

export async function GET() {
  const manifest = await buildManifest((await headers()).get("user-agent"))
  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      // Session-dependent (varies by signed-in tenant) — never cache/share.
      "Cache-Control": "private, no-store",
      // Belt and braces alongside no-store: the body differs by platform now.
      Vary: "User-Agent",
    },
  })
}
