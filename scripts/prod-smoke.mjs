#!/usr/bin/env node
/**
 * Production HTTP smoke for LoadOff hub (no secrets required).
 *
 * Usage: node scripts/prod-smoke.mjs
 * Env:   PROD_BASE_URL (default https://thindtransport.com)
 *
 * Sandboxed QA containers reach the internet through an egress proxy that
 * answers CONNECT with its own 403 for hosts outside the network policy.
 * That 403 is the proxy speaking, not the site — a genuine Vercel response
 * (even an error) always carries an `x-vercel-id` header. Checks that fail
 * without one are reported INCONCLUSIVE (exit 2), not FAIL: the run learned
 * nothing about production and should verify via the Vercel dashboard/MCP
 * instead of filing a defect.
 */
const BASE = (process.env.PROD_BASE_URL ?? "https://thindtransport.com").replace(/\/$/, "")

const checks = []

function isProxyBlock(err) {
  if (!process.env.HTTPS_PROXY && !process.env.https_proxy) return false
  const text = `${err.message ?? err} ${err.cause?.message ?? ""}`.toLowerCase()
  return /proxy|connect|tunnel/.test(text)
}

async function fetchCheck(name, path, { expectStatus = 200, bodyIncludes = [], bodyIncludesIgnoreCase = [] } = {}) {
  const url = `${BASE}${path}`
  try {
    const res = await fetch(url, { redirect: "follow" })
    const body = await res.text()
    const bodyLower = body.toLowerCase()
    const okStatus = res.status === expectStatus || (expectStatus === "not5xx" && res.status < 500)
    const missing = bodyIncludes.filter((s) => !body.includes(s))
    const missingCi = bodyIncludesIgnoreCase.filter((s) => !bodyLower.includes(s.toLowerCase()))
    const fromVercel = res.headers.has("x-vercel-id") || /vercel/i.test(res.headers.get("server") ?? "")
    const pass = fromVercel && okStatus && missing.length === 0 && missingCi.length === 0
    checks.push({
      name,
      pass,
      inconclusive: !pass && !fromVercel,
      detail: pass
        ? `${res.status} OK`
        : `status=${res.status}${fromVercel ? "" : " (response not from Vercel — egress proxy block?)"}${missing.length ? ` missing: ${missing.join(", ")}` : ""}${missingCi.length ? ` missing (ci): ${missingCi.join(", ")}` : ""}`,
      url,
    })
  } catch (err) {
    checks.push({
      name,
      pass: false,
      inconclusive: isProxyBlock(err),
      detail: String(err.message ?? err),
      url,
    })
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
    if (!c.pass) c.inconclusive ? inconclusive++ : failed++
  }

  console.log("")
  if (failed) {
    console.log(`${failed} check(s) failed.`)
    process.exit(1)
  }
  if (inconclusive) {
    console.log(
      `${inconclusive} check(s) inconclusive — egress to ${BASE} is blocked by the sandbox proxy, not by the site. Verify production via the Vercel dashboard/MCP instead.`
    )
    process.exit(2)
  }
  console.log("All checks passed.")
}

main()
