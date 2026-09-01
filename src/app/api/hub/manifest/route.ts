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
import { isAppHost } from "@/lib/app-origin"
import { LOADOFF_BRAND } from "@/lib/hub/brand"

/**
 * Same background/theme as the static fallback (public/hub.webmanifest) and as
 * the cover InstalledAppRedirect paints — all three read LOADOFF_BRAND.launch,
 * so the splash screen, the status bar and the launch flash cannot drift apart
 * from each other or from the icon.
 */
export const DEFAULT_THEME_COLOR = LOADOFF_BRAND.launch
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

const SHORTCUT_ICONS = [{ src: "/hub-icon-192.png", sizes: "192x192" }]

/**
 * Long-press (Android) / right-click (desktop) shortcuts on the installed
 * icon. Branched by role, not user agent: a driver's icon should jump to
 * loads and pay, not a dispatch board their account can't open. Signed-out
 * installs get the office set — same as the old static manifest — and a
 * driver who somehow taps an office shortcut is bounced by requireOfficeUser.
 * Every URL is inside both possible scopes ("/hub" and "/"), and names stay
 * ≤25 chars so Android doesn't truncate them.
 */
export const OFFICE_SHORTCUTS = [
  {
    name: "Today",
    description: "What's due, who hasn't confirmed, money not yet invoiced",
    url: "/hub",
    icons: SHORTCUT_ICONS,
  },
  {
    name: "Dispatch board",
    description: "Loads by status, drag to assign",
    url: "/hub/dispatch",
    icons: SHORTCUT_ICONS,
  },
  {
    name: "Money",
    description: "Invoices, settlements, what's owed",
    url: "/hub/money",
    icons: SHORTCUT_ICONS,
  },
  {
    name: "Driver app",
    description: "Confirm dispatch, PODs, pay",
    url: "/hub/driver",
    icons: SHORTCUT_ICONS,
  },
]

export const DRIVER_SHORTCUTS = [
  {
    name: "Today's loads",
    description: "Confirm dispatch, arrivals, PODs",
    url: "/hub/driver",
    icons: SHORTCUT_ICONS,
  },
  {
    name: "Pay",
    description: "Settlements and pay stubs",
    url: "/hub/driver/pay",
    icons: SHORTCUT_ICONS,
  },
  {
    name: "Messages",
    description: "Dispatch chat",
    url: "/hub/driver/messages",
    icons: SHORTCUT_ICONS,
  },
]

export function manifestShortcuts(role: string | null | undefined) {
  return role === "driver" ? DRIVER_SHORTCUTS : OFFICE_SHORTCUTS
}

export async function buildManifest(userAgent?: string | null, host?: string | null) {
  const themeColor = await resolveManifestThemeColor()
  const user = await getHubUser()
  // On the app's own origin there is no marketing page to be out of scope of,
  // so the manifest claims the whole origin honestly — one scope for every
  // platform, no user-agent sniffing. start_url stays /hub because that is
  // where the app lives on either origin; the app origin's root redirects
  // there, and scope "/" covers both.
  const ownOrigin = isAppHost(host)
  return {
    name: PRODUCT.name,
    short_name: PRODUCT.shortName,
    description:
      "Dispatch, money, compliance, and driver tools for small and mid-size trucking carriers — all in one place.",
    // `id` pins the app's identity independently of start_url and scope, so a
    // later change to either updates the installed app rather than minting a
    // second one beside it. (Chromium only — iOS mints a fresh icon regardless.)
    id: "/hub",
    start_url: "/hub",
    scope: ownOrigin ? "/" : manifestScope(userAgent),
    display: "standalone",
    background_color: themeColor,
    theme_color: themeColor,
    icons: [
      { src: "/hub-icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/hub-icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/hub-icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: manifestShortcuts(user?.role),
  }
}

export async function GET() {
  const h = await headers()
  const manifest = await buildManifest(h.get("user-agent"), h.get("host"))
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
