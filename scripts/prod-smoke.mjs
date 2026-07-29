#!/usr/bin/env node
/**
 * Production HTTP smoke for LoadOff hub (no secrets required).
 *
 * Usage: node scripts/prod-smoke.mjs
 * Env:   PROD_BASE_URL (default https://thindtransport.com)
 *        PROD_SMOKE_GRACE_MINUTES (default 15 — mismatch younger than this is
 *        "deploy in flight", not stale)
 *
 * Checks: /hub/login 200 + branding · /hub not-5xx · /api/version SHA matches
 * origin/main (catches a drain whose build Vercel dedupe-swallowed).
 *
 * Exit codes: 0 all checks passed · 1 at least one check got a bad HTTP
 * response (real prod signal) · 2 inconclusive — every request died at the
 * network layer (sandbox egress proxies 403 the CONNECT tunnel to prod, so
 * no byte ever reached thindtransport.com). On 2, fall back to Vercel
 * deployment status per docs/agent-improvement-loop.md §3b instead of
 * treating prod as down.
 */
import path from "node:path"
import { execFileSync } from "node:child_process"

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

const short = (sha) => (sha ? sha.slice(0, 7) : "?")

/**
 * "Site returns 200" is not "site is current": the 2026-07-19 drain bug moved
 * the production alias while Vercel's SHA dedupe swallowed the build, so prod
 * served 194-commit-old code with every HTTP check green. This verdict compares
 * the SHA production says it is running (GET /api/version, stamped from
 * VERCEL_GIT_COMMIT_SHA) against origin/main. Pure so it can be unit-tested;
 * the git/fetch plumbing lives in the callers.
 *
 * Grace: a mismatch while origin/main's tip is younger than graceMinutes is a
 * deploy likely still building, not an alarm. An unknown tip age gets no grace
 * — the rigs running this smoke `git pull` first, so age is normally known,
 * and the failure mode we exist to catch must not hide behind a lookup error.
 *
 * @param {{ prodSha: string | null, mainSha: string | null, behindCount?: number | null, tipAgeMinutes?: number | null, graceMinutes?: number }} args
 */
/**
 * @param {{
 *   prodSha: string | null,
 *   mainSha: string | null,
 *   behindCount?: number | null,
 *   tipAgeMinutes?: number | null,
 *   graceMinutes?: number,
 * }} params
 */
export function evaluateStaleness({ prodSha, mainSha, behindCount = null, tipAgeMinutes = null, graceMinutes = 15 }) {
  if (!mainSha) {
    return { status: "inconclusive", detail: "could not resolve origin/main — staleness unknown" }
  }
  const withinGrace = tipAgeMinutes != null && tipAgeMinutes < graceMinutes
  const tipAge = tipAgeMinutes == null ? "unknown age" : `${Math.round(tipAgeMinutes)}m old`
  if (!prodSha) {
    if (withinGrace) {
      return { status: "grace", detail: `no /api/version yet, but origin/main tip is ${tipAge} — deploy likely in flight` }
    }
    return {
      status: "stale",
      detail: `production has no /api/version (origin/main tip ${tipAge}) — deployment predates the staleness check or the route broke; drain main with a --no-ff merge`,
    }
  }
  if (prodSha === mainSha) {
    return { status: "current", detail: `production is current with origin/main (${short(prodSha)})` }
  }
  const behind = behindCount == null ? "" : ` (${behindCount} commit${behindCount === 1 ? "" : "s"} behind)`
  if (withinGrace) {
    return {
      status: "grace",
      detail: `production on ${short(prodSha)}, origin/main at ${short(mainSha)}${behind} — tip is ${tipAge}, deploy likely in flight`,
    }
  }
  return {
    status: "stale",
    detail: `production on ${short(prodSha)}, origin/main at ${short(mainSha)}${behind} — tip is ${tipAge}; a drain was likely swallowed, re-drain with a --no-ff merge`,
  }
}

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim()
}

/** origin/main's tip SHA — live from the remote when possible, local ref as fallback. */
function resolveMainSha() {
  try {
    const line = git("ls-remote", "origin", "refs/heads/main")
    const sha = line.split(/\s/)[0]
    if (/^[0-9a-f]{40}$/.test(sha)) return sha
  } catch {
    // egress to GitHub may be blocked on the same rigs that block prod HTTPS
  }
  try {
    return git("rev-parse", "origin/main")
  } catch {
    return null
  }
}

function mainTipAgeMinutes(mainSha) {
  for (const ref of [mainSha, "origin/main"]) {
    try {
      const epoch = Number(git("show", "-s", "--format=%ct", ref))
      if (Number.isFinite(epoch) && epoch > 0) return (Date.now() / 1000 - epoch) / 60
    } catch {
      // ls-remote can be ahead of the local clone; fall through to origin/main
    }
  }
  return null
}

function behindCount(prodSha, mainSha) {
  try {
    return Number(git("rev-list", "--count", `${prodSha}..${mainSha}`))
  } catch {
    return null // prod's SHA isn't in the local clone — count unknowable, mismatch already established
  }
}

/** Fetch /api/version and fold the staleness verdict into `checks`. */
async function stalenessCheck() {
  const name = "production is current with origin/main"
  const url = `${BASE}/api/version`
  let prodSha = null
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
    if (res.status === 200) {
      try {
        prodSha = JSON.parse(body)?.sha ?? null
      } catch {
        prodSha = null // 200 but not our JSON — treat like a missing endpoint
      }
    }
    // any non-200 (404 on a pre-endpoint deployment, 5xx) leaves prodSha null:
    // evaluateStaleness treats that as stale once past the grace window
  } catch (err) {
    const tunnelRefusal = egressBlockedThrown(err)
    checks.push({
      name,
      pass: false,
      blocked: Boolean(tunnelRefusal),
      networkError: !tunnelRefusal,
      detail: tunnelRefusal
        ? `egress-blocked at proxy CONNECT (${tunnelRefusal}) — not a prod response`
        : `${String(err.message ?? err)}${err.cause ? ` (${String(err.cause.message ?? err.cause)})` : ""}`,
      url,
    })
    return
  }

  const mainSha = resolveMainSha()
  const graceMinutes = Number(process.env.PROD_SMOKE_GRACE_MINUTES ?? "") || 15
  const verdict = evaluateStaleness({
    prodSha,
    mainSha,
    behindCount: prodSha && mainSha ? behindCount(prodSha, mainSha) : null,
    tipAgeMinutes: mainSha ? mainTipAgeMinutes(mainSha) : null,
    graceMinutes,
  })
  checks.push({
    name,
    pass: verdict.status === "current" || verdict.status === "grace",
    networkError: verdict.status === "inconclusive",
    detail: verdict.detail,
    url,
  })
}

async function main() {
  console.log(`LoadOff production smoke — ${BASE}`)
  console.log("=".repeat(50))

  await fetchCheck("hub login page", "/hub/login", {
    expectStatus: 200,
    bodyIncludesIgnoreCase: ["loadoff"],
  })
  await fetchCheck("hub root", "/hub", { expectStatus: "not5xx" })
  await stalenessCheck()

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
