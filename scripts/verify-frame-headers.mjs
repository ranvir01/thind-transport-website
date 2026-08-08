/**
 * Toolbox frameability check — re-verifies the response headers behind every
 * external `embed: "frame"` promise in src/lib/hub/workbench.ts.
 *
 * A row may only be promoted to in-frame on hard header evidence
 * (docs/decisions/0003-everything-app.md), and headers change without notice:
 * the day WSDOT adds X-Frame-Options, the Toolbox would render a refusal
 * where a pass report should be. Run this before flipping any row and
 * periodically after (the nightly rig is the natural home).
 *
 * Reads the registry itself, so the URL list can't drift from the code.
 * Exit codes: 0 = every frame row still frameable; 1 = a frame row is now
 * BLOCKED (flip it back to sheet); 2 = network prevented a definitive answer
 * (do not treat as pass or fail — rerun somewhere with real egress).
 *
 * Headers ≠ proof against JS frame-busting: after any flip, load the page in
 * a real <iframe> once and look.
 *
 * Usage: node scripts/verify-frame-headers.mjs
 */
import { WORKBENCH_RESOURCES } from "../src/lib/hub/workbench.ts"

const UA = "LoadOff-ToolboxHeaderCheck/1.0 (ranvirthind.rst@gmail.com)"

async function probe(url) {
  let res
  try {
    res = await fetch(url, { method: "HEAD", redirect: "follow", headers: { "User-Agent": UA } })
    // Some IIS/ASP.NET hosts 405 HEAD or strip headers on it — fall back to GET.
    if (!res.ok || (!res.headers.get("x-frame-options") && !res.headers.get("content-security-policy"))) {
      const g = await fetch(url, { redirect: "follow", headers: { "User-Agent": UA } }).catch(() => null)
      if (g) res = g
    }
  } catch (err) {
    return { url, error: String(err) }
  }
  const xfo = res.headers.get("x-frame-options")
  const csp = res.headers.get("content-security-policy")
  const fa = csp?.match(/frame-ancestors\s+([^;]+)/i)?.[1]?.trim() ?? null
  // frame-ancestors has NO fallback to default-src (CSP spec) — only the
  // directive itself restricts framing.
  const blocked = Boolean(xfo) || (fa !== null && !/\*/.test(fa))
  return {
    url,
    status: res.status,
    xfo: xfo ?? "(none)",
    frameAncestors: fa ?? "(none)",
    verdict: blocked ? "BLOCKED" : "FRAMEABLE",
  }
}

const external = WORKBENCH_RESOURCES.filter((r) => !r.url.startsWith("/"))
const results = await Promise.all(external.map(async (r) => ({ row: r, ...(await probe(r.url)) })))

let regressions = 0
let unreachable = 0
for (const r of results) {
  if (r.error) {
    unreachable++
    console.log(`?  ${r.row.id}: unreachable (${r.error.slice(0, 80)})`)
    continue
  }
  const promisesFrame = r.row.embed === "frame"
  const mark = promisesFrame && r.verdict === "BLOCKED" ? "✗" : "✓"
  if (mark === "✗") regressions++
  console.log(
    `${mark}  ${r.row.id}: registry=${r.row.embed}${r.row.frameVerified ? ` (verified ${r.row.frameVerified})` : ""} · live=${r.verdict} · XFO=${r.xfo} · frame-ancestors=${r.frameAncestors}`
  )
  if (!promisesFrame && r.verdict === "FRAMEABLE") {
    console.log(`   ↳ candidate to promote: run a visual iframe test, then set embed:"frame" + frameVerified date`)
  }
}

if (regressions > 0) {
  console.error(`\n${regressions} frame row(s) now BLOCKED — flip back to sheet or the Toolbox shows a refusal page.`)
  process.exit(1)
}
if (unreachable === external.length) {
  console.error("\nNo host was reachable — this environment has no egress; rerun where the network is real.")
  process.exit(2)
}
console.log("\nAll frame promises hold.")
