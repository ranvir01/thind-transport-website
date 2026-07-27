/**
 * Benign-resource classifier for the e2e smokes' browser-error gate.
 *
 * The browser reports a failed resource load as a URL-less console line
 * ("Failed to load resource: the server responded with a status of 404 (Not
 * Found)"), so a benign 404 cannot be told from a real one by the console text
 * — only by the request URL. This module is the single source of truth for
 * which failing URLs are structural local-rig / browser noise, matched against
 * response and requestfailed URLs (see trackPageErrors in e2e-lib.mjs).
 *
 * Kept dependency-free (no puppeteer import) so the vitest regression
 * (src/lib/hub/__tests__/e2e-console-filter.test.ts) can pin it without pulling
 * a browser into the unit suite.
 *
 * Benign URLs:
 *   • favicon / web app manifest — absent or irrelevant on a headless rig.
 *   • Vercel Web Analytics + Speed Insights scripts. <Analytics/> and
 *     <SpeedInsights/> mount in the root layout (src/app/layout.tsx), so EVERY
 *     page requests /_vercel/insights/script.js and
 *     /_vercel/speed-insights/script.js. Those are served by Vercel's edge in
 *     production and simply 404 under `next start` locally — an environment
 *     artifact, never a product defect. Before this filter existed, the smokes
 *     either false-failed on them (favicon|manifest-only filters) or blanket-
 *     dropped every "Failed to load resource"/"404" line and lost real signal.
 */
export const BENIGN_RESOURCE_URL =
  /favicon|manifest|\/_vercel\/(speed-)?insights\/script\.js/i

/** True when a failed resource URL is benign local-rig / browser noise, not an app defect. */
export const isBenignResourceUrl = (url) => BENIGN_RESOURCE_URL.test(url ?? "")
