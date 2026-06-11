/**
 * HaulDesk — the product identity of the operations software.
 *
 * The software is a standalone, multi-tenant product ("the Hub" in older docs).
 * It is NOT branded after any one carrier: Thind Transport is simply tenant #1.
 * Carrier-specific facts (name, DOT/MC, address, logo) always come from the
 * carrier record (`hub.carriers` / `carrier_settings`) — never from here and
 * never from `src/lib/constants.ts`.
 *
 * Renaming the product is a one-line change in this file.
 */
export const PRODUCT = {
  /** Product name shown across the app, PDFs, and emails. */
  name: "HaulDesk",
  /** Short name for tight spaces (PWA, mobile header). */
  shortName: "HaulDesk",
  /** Wordmark split for the two-line lockup used in nav/login. */
  wordmark: "HAULDESK",
  tagline: "The office for your fleet",
  description:
    "Dispatch, money, compliance, and driver tools for small and mid-size trucking carriers — all in one place.",
  /** Used in User-Agent strings for free public APIs (Nominatim, NWS). */
  userAgent: "HaulDesk TMS (support@hauldesk.app)",
  supportEmail: "support@hauldesk.app",
} as const
