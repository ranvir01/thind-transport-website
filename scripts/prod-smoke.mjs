#!/usr/bin/env node
/**
 * Production HTTP smoke for LoadOff hub (no secrets required).
 *
 * Usage: node scripts/prod-smoke.mjs
 * Env:   PROD_BASE_URL (default https://thindtransport.com)
 *
 * Exit codes: 0 all checks passed · 1 at least one check got a bad HTTP
 * response (real prod signal) · 2 inconclusive — every request died at the
 * network layer (sandbox egress proxies 403 the CONNECT tunnel to prod, so
 * no byte ever reached thindtransport.com). On 2, fall back to Vercel
 * deployment status per docs/agent-improvement-loop.md §3b instead of
 * treating prod as down.
 */
const BASE = (process.env.PROD_BASE_URL ?? "https://thindtransport.com").replace(/\/$/, "")

const checks = []

async function fetchCheck(name, path, { expectStatus = 200, bodyIncludes = [], bodyIncludesIgnoreCase = [] } = {}) {
  const url = `${BASE}${path}`
  try {
    const res = await fetch(url, { redirect: "follow" })
    // Sandbox egress proxies answer for blocked hosts with their own 403 and
    // an x-deny-reason header — that response never came from prod, so it
    // must not count as a prod pass OR fail ("not5xx" would pass a 403).
    const denyReason = res.headers.get("x-deny-reason")
    if (denyReason) {
      checks.push({ name, pass: false, networkError: true, detail: `egress denied by proxy: ${denyReason} (status ${res.status})`, url })
      return
    }
    const body = await res.text()
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
    // fetch() rejects only when no HTTP response ever arrived (DNS, TLS,
    // proxy CONNECT denial) — the root cause lives on err.cause.
    const cause = err.cause ? ` (${String(err.cause.message ?? err.cause)})` : ""
    checks.push({ name, pass: false, networkError: true, detail: `${String(err.message ?? err)}${cause}`, url })
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
  for (const c of checks) {
    const mark = c.pass ? "PASS" : "FAIL"
    console.log(`${mark}  ${c.name}`)
    console.log(`      ${c.url}`)
    console.log(`      ${c.detail}`)
    if (!c.pass) failed++
  }

  console.log("")
  if (failed && checks.every((c) => c.networkError)) {
    console.log("INCONCLUSIVE: no request reached the server — egress to prod is blocked")
    console.log("from this environment (proxy CONNECT denial / DNS / TLS), so this says")
    console.log("nothing about production health. Check Vercel deployment status instead")
    console.log("(docs/agent-improvement-loop.md §3b).")
    process.exit(2)
  }
  if (failed) {
    console.log(`${failed} check(s) failed.`)
    process.exit(1)
  }
  console.log("All checks passed.")
}

main()
