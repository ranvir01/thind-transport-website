#!/usr/bin/env node
/**
 * Production HTTP smoke for LoadOff hub (no secrets required).
 *
 * Usage: node scripts/prod-smoke.mjs
 * Env:   PROD_BASE_URL (default https://thindtransport.com)
 */
const BASE = (process.env.PROD_BASE_URL ?? "https://thindtransport.com").replace(/\/$/, "")

const checks = []

async function fetchCheck(name, path, { expectStatus = 200, bodyIncludes = [] } = {}) {
  const url = `${BASE}${path}`
  try {
    const res = await fetch(url, { redirect: "follow" })
    const body = await res.text()
    const okStatus = res.status === expectStatus || (expectStatus === "not5xx" && res.status < 500)
    const missing = bodyIncludes.filter((s) => !body.includes(s))
    const pass = okStatus && missing.length === 0
    checks.push({
      name,
      pass,
      detail: pass
        ? `${res.status} OK`
        : `status=${res.status}${missing.length ? ` missing: ${missing.join(", ")}` : ""}`,
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
    bodyIncludes: ["LOADOFF"],
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
  if (failed) {
    console.log(`${failed} check(s) failed.`)
    process.exit(1)
  }
  console.log("All checks passed.")
}

main()
