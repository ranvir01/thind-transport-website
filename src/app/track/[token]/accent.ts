/**
 * Per-tenant accent for the public tracking page (Phase 7 branding).
 *
 * /track/[token] is the same customer surface as /hub/portal — the carrier's
 * front door for brokers and shippers — so it takes the same WCAG-gated
 * accent treatment (`resolvePortalAccent`). `getTrackedLoad` deliberately
 * exposes no carrier id to this public page, so the accent resolves straight
 * from the share-link token here instead of widening that lib contract; the
 * lookup mirrors getTrackedLoad's token guard (unrevoked links only), which
 * also keeps revoked links on the stock chrome.
 */
import { queryOne } from "@/lib/hub/db"
import { getCarrierSettings } from "@/lib/hub/settings"
import { PORTAL_ACCENT_DEFAULT, resolvePortalAccent, type PortalAccent } from "@/app/hub/portal/accent"

/** Token → the carrier's chrome accent; stock chrome for unknown/revoked links or on any error. */
export async function getTrackAccent(token: string): Promise<PortalAccent> {
  try {
    const link = await queryOne<{ carrier_id: string }>(
      `SELECT carrier_id FROM hub.share_links WHERE token = $1 AND revoked_at IS NULL`,
      [token]
    )
    if (!link) return PORTAL_ACCENT_DEFAULT
    const settings = await getCarrierSettings(link.carrier_id)
    return resolvePortalAccent(settings.branding.accent)
  } catch {
    return PORTAL_ACCENT_DEFAULT
  }
}
