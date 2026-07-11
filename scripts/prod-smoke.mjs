#!/usr/bin/env node
/**
 * Production HTTP smoke for LoadOff hub (no secrets required).
 *
 * Usage: node scripts/prod-smoke.mjs
 * Env:   PROD_BASE_URL (default https://thindtransport.com)
 */
const BASE = (process.env.PROD_BASE_URL ?? "https://thindtransport.com").replace(/\/$/, "")

const checks = []

// Sandboxed agent containers route HTTPS through an egress proxy that answers
// CONNECT for non-allowlisted hosts itself (403, x-deny-reason header, "not in
// allowlist" plain-text body). That response says nothing about production —
// without this guard the "not5xx" checks false-pass on it. Playbook §3b: fall
// back to Vercel deployment status when this fires.
function isProxyDenial(res, body) {
  return res.headers.has("x-deny-reason") || /host not in allowlist/i.test(body)
}

async function fetchCheck(name, path, { expectStatus = 200, bodyIncludes = [], bodyIncludesIgnoreCase = [] } = {}) {
  const url = `${BASE}${path}`
  try {
    const res = await fetch(url, { redirect: "follow" })
    const body = await res.text()
    if (isProxyDenial(res, body)) {
      checks.push({ name, pass: false, inconclusive: true, detail: `egress proxy denied CONNECT (${res.status}) — production unreached`, url })
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
  let inconclusive = 0
  for (const c of checks) {
    const mark = c.pass ? "PASS" : c.inconclusive ? "INCONCLUSIVE" : "FAIL"
    console.log(`${mark}  ${c.name}`)
    console.log(`      ${c.url}`)
    console.log(`      ${c.detail}`)
    if (c.inconclusive) inconclusive++
    else if (!c.pass) failed++
  }

  console.log("")
  if (failed) {
    console.log(`${failed} check(s) failed.`)
    process.exit(1)
  }
  if (inconclusive) {
    console.log(`${inconclusive} check(s) inconclusive: egress to production is blocked here, not a prod failure. Use the Vercel deployment-status fallback (docs/agent-improvement-loop.md §3b).`)
    process.exit(2)
  }
  console.log("All checks passed.")
}

main()
