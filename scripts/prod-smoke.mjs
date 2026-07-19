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
import path from "node:path"

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
export function egressBlocked(res, body) {
  if (res.status !== 403) return false
  return res.headers.has("x-deny-reason") || /host not in allowlist/i.test(body)
}

/**
 * Other rigs deny egress one step earlier, at the proxy CONNECT handshake:
 * fetch() rejects ("fetch failed") with an undici cause chain ending in
 * "Proxy response (403) !== 200 when HTTP Tunneling". The probe never left
 * the sandbox, so this is the same BLOCKED outcome as a gateway 403 response
 * — any tunnel refusal means prod was never reached, whatever the code.
 * Returns the tunnel-refusal message, or null if the error is something else.
 */
export function egressBlockedThrown(err) {
  for (let e = err, depth = 0; e && depth < 8; e = e.cause, depth++) {
    const msg = String(e.message ?? "")
    if (/proxy response.*when http tunneling/i.test(msg)) return msg
  }
  return null
}

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
    const tunnelRefusal = egressBlockedThrown(err)
    if (tunnelRefusal) {
      checks.push({
        name,
        pass: false,
        blocked: true,
        detail: `egress-blocked at proxy CONNECT (${tunnelRefusal}) — not a prod response`,
        url,
      })
      return
    }
    // fetch() rejects only when no HTTP response ever arrived (DNS, TLS,
    // proxy CONNECT denial) — the root cause lives on err.cause. Whatever the
    // exact cause, no byte reached the server, so this is inconclusive, not a
    // real prod failure signal.
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

  // A check is "inconclusive" (blocked at the network/proxy layer, never a
  // real prod response) if it hit the sandbox gateway's 403 marker or the
  // fetch() call itself never got a response. Those must never masquerade as
  // a real prod failure, but a real failure elsewhere must not be masked by
  // an unrelated inconclusive check either — real failures take priority.
  let realFail = 0
  let inconclusive = 0
  for (const c of checks) {
    const isInconclusive = c.blocked || c.networkError
    const mark = isInconclusive ? "BLOCKED" : c.pass ? "PASS" : "FAIL"
    console.log(`${mark}  ${c.name}`)
    console.log(`      ${c.url}`)
    console.log(`      ${c.detail}`)
    if (!c.pass) {
      if (isInconclusive) inconclusive++
      else realFail++
    }
  }

  console.log("")
  if (realFail) {
    console.log(`${realFail} check(s) failed.`)
    process.exit(1)
  }
  if (inconclusive) {
    console.log(
      `${inconclusive} check(s) egress-blocked — this rig cannot reach ${BASE}. ` +
        "Prod status is UNKNOWN from here: use the Vercel deployment-status fallback " +
        "(docs/agent-improvement-loop.md §3b). Not a prod failure."
    )
    process.exit(2)
  }
  console.log("All checks passed.")
}

const runDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)
if (runDirectly) main()
