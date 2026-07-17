#!/usr/bin/env node
/**
 * Production HTTP smoke for LoadOff hub (no secrets required).
 *
 * Usage: node scripts/prod-smoke.mjs
 * Env:   PROD_BASE_URL (default https://thindtransport.com)
 */
const BASE = (process.env.PROD_BASE_URL ?? "https://thindtransport.com").replace(/\/$/, "")

const checks = []

/**
 * Sandboxed agent rigs route HTTPS through an egress gateway that answers 403
 * for hosts outside the network allowlist. That 403 is the sandbox, not prod —
 * before this check, "/hub must not 5xx" printed "403 OK" (PASS) while the
 * probe never reached thindtransport.com at all. The gateway self-identifies
 * (x-deny-reason header, "Host not in allowlist" plain-text body; real prod
 * responses come from Vercel and carry x-vercel-id), so treat it as a distinct
 * BLOCKED outcome and exit 2: the caller must fall back to the Vercel
 * deployment-status check (docs/agent-improvement-loop.md §3b), not report a
 * prod failure — and never a prod success.
 */
function egressBlocked(res, body) {
  if (res.status !== 403) return false
  return res.headers.has("x-deny-reason") || /host not in allowlist/i.test(body)
}

async function fetchCheck(name, path, { expectStatus = 200, bodyIncludes = [], bodyIncludesIgnoreCase = [] } = {}) {
  const url = `${BASE}${path}`
  try {
    const res = await fetch(url, { redirect: "follow" })
    const body = await res.text()
    if (egressBlocked(res, body)) {
      checks.push({
        name,
        pass: false,
        blocked: true,
        detail: `egress-blocked by sandbox proxy (${res.headers.get("x-deny-reason") ?? "host not in allowlist"}) — not a prod response`,
        url,
      })
      return
    }
    const bodyLower = body.toLowerCase()
    const okStatus = res.status === expectStatus || (expectStatus === "not5xx" && res.status < 500)
    const missing = bodyIncludes.filter((s) => !body.includes(s))
    const missingCi = bodyIncludesIgnoreCase.filter((s) => !bodyLower.includes(s.toLowerCase()))
    const pass = okStatus && missing.length === 0 && missingCi.length === 0
    checks.push({
      name,
      pass,
      detail: pass
        ? `${res.status} OK`
        : `status=${res.status}${missing.length ? ` missing: ${missing.join(", ")}` : ""}${missingCi.length ? ` missing (ci): ${missingCi.join(", ")}` : ""}`,
      url,
    })
  } catch (err) {
    checks.push({ name, pass: false, detail: String(err.message ?? err), url })
  }
}

async function main() {
  console.log(`LoadOff production smoke — ${BASE}`)
  console.log("=".repeat(50))

  await fetchCheck("hub login page", "/hub/login", {
    expectStatus: 200,
    bodyIncludesIgnoreCase: ["loadoff"],
  })
  await fetchCheck("hub root", "/hub", { expectStatus: "not5xx" })

  let failed = 0
  let blocked = 0
  for (const c of checks) {
    const mark = c.blocked ? "BLOCKED" : c.pass ? "PASS" : "FAIL"
    console.log(`${mark}  ${c.name}`)
    console.log(`      ${c.url}`)
    console.log(`      ${c.detail}`)
    if (c.blocked) blocked++
    else if (!c.pass) failed++
  }

  console.log("")
  if (blocked) {
    console.log(
      `${blocked} check(s) egress-blocked — this rig cannot reach ${BASE}. ` +
        "Prod status is UNKNOWN from here: use the Vercel deployment-status fallback " +
        "(docs/agent-improvement-loop.md §3b). Not a prod failure."
    )
    process.exit(2)
  }
  if (failed) {
    console.log(`${failed} check(s) failed.`)
    process.exit(1)
  }
  console.log("All checks passed.")
}

main()
