#!/usr/bin/env node
/**
 * Production HTTP smoke for LoadOff hub (no secrets required).
 *
 * Usage: node scripts/prod-smoke.mjs
 * Env:   PROD_BASE_URL (default https://thindtransport.com)
 *
 * Exit codes: 0 all checks passed · 1 production is failing checks ·
 * 2 inconclusive — the responses did not come from Vercel (an egress proxy
 * answered instead, e.g. an agent-sandbox network policy), so the run says
 * nothing about production health. Automations must NOT fix-forward on exit 2.
 */
const BASE = (process.env.PROD_BASE_URL ?? "https://thindtransport.com").replace(/\/$/, "")

// Any response actually served by Vercel carries x-vercel-id — including real
// 4xx/5xx errors. A 403 without it is a middlebox (egress proxy) denying the
// request, which looked identical to "production down" and caused false
// alarms; it even PASSed the not5xx check once. No x-vercel-id → no verdict.
//
// The control URL only arbitrates network-level throws (DNS dead, connection
// refused): if it is reachable while BASE throws, the outage is real. It is
// deliberately NOT consulted for proxy-answered responses — sandbox policies
// often allowlist vercel.com while blocking BASE, which would fake "egress
// works, production down".
const CONTROL_URL = "https://vercel.com/"

// No middlebox can sit between this process and loopback, so a local prod
// build (PROD_BASE_URL=http://localhost:3000) is judged on criteria alone.
const LOOPBACK = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(BASE)

const checks = []

async function fetchCheck(name, path, { expectStatus = 200, bodyIncludes = [], bodyIncludesIgnoreCase = [] } = {}) {
  const url = `${BASE}${path}`
  try {
    const res = await fetch(url, { redirect: "follow" })
    const body = await res.text()
    const bodyLower = body.toLowerCase()
    const fromVercel = res.headers.has("x-vercel-id") || LOOPBACK
    const okStatus = res.status === expectStatus || (expectStatus === "not5xx" && res.status < 500)
    const missing = bodyIncludes.filter((s) => !body.includes(s))
    const missingCi = bodyIncludesIgnoreCase.filter((s) => !bodyLower.includes(s.toLowerCase()))
    const criteriaMet = okStatus && missing.length === 0 && missingCi.length === 0
    const verdict = !fromVercel ? "inconclusive" : criteriaMet ? "pass" : "fail"
    checks.push({
      name,
      verdict,
      detail:
        `status=${res.status}` +
        `${missing.length ? ` missing: ${missing.join(", ")}` : ""}` +
        `${missingCi.length ? ` missing (ci): ${missingCi.join(", ")}` : ""}` +
        `${fromVercel ? "" : " (no x-vercel-id — response is not from Vercel; egress proxy?)"}`,
      url,
    })
  } catch (err) {
    checks.push({ name, verdict: "thrown", detail: String(err.message ?? err), url })
  }
}

async function egressWorks() {
  try {
    const res = await fetch(CONTROL_URL, { redirect: "follow" })
    return res.status < 500
  } catch {
    return false
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

  const marks = { pass: "PASS", fail: "FAIL", inconclusive: "????", thrown: "????" }
  for (const c of checks) {
    console.log(`${marks[c.verdict]}  ${c.name}`)
    console.log(`      ${c.url}`)
    console.log(`      ${c.detail}`)
  }
  const count = (v) => checks.filter((c) => c.verdict === v).length

  console.log("")
  if (count("fail")) {
    console.log(`${count("fail")} check(s) failed with genuine Vercel responses.`)
    process.exit(1)
  }
  if (count("thrown")) {
    // Network-level failure: real outage if this machine's egress works.
    if (await egressWorks()) {
      console.log(`${count("thrown")} check(s) could not connect while ${CONTROL_URL} is reachable — ${BASE} looks down.`)
      process.exit(1)
    }
    console.log(
      `INCONCLUSIVE: could not connect to ${BASE} and the control probe (${CONTROL_URL}) also failed — ` +
        "this machine's egress is broken. Production health is UNKNOWN; do not fix-forward."
    )
    process.exit(2)
  }
  if (count("inconclusive")) {
    console.log(
      `INCONCLUSIVE: ${count("inconclusive")} response(s) did not come from Vercel — an egress proxy answered ` +
        "(agent-sandbox network policy?). Production health is UNKNOWN; do not fix-forward. " +
        "Probe via the Vercel MCP (web_fetch_vercel_url) or from a machine with open egress instead."
    )
    process.exit(2)
  }
  console.log("All checks passed.")
}

main()
