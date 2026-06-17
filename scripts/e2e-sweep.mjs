#!/usr/bin/env node
/**
 * Lightweight HaulDesk route sweep.
 *
 * Uses sandbox credentials so it can run against:
 * - `npm run dev:mobile` quick-tunnel URL
 * - Vercel preview URL
 * - localhost
 */

const baseUrl = (process.env.HAULDESK_E2E_URL || process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "")
const email = process.env.HAULDESK_E2E_EMAIL || "owner@sandbox.hauldesk.local"
const password = process.env.HAULDESK_E2E_PASSWORD || "SandboxOwner1!"

const officePaths = [
  "/hub",
  "/hub/loads",
  "/hub/money",
  "/hub/fleet",
  "/hub/ranker",
  "/hub/reports",
  "/hub/reports/builder",
  "/hub/onboarding",
  "/hub/settings/pay-tariffs",
  "/hub/settings/integrations",
  "/hub/settings/appearance",
]

const publicPaths = [
  "/hub/driver",
  "/hub/driver/documents",
  "/hub/driver/pay",
  "/hub/driver/more",
  "/hub/driver/offline",
  "/track/sandbox",
  "/hub.webmanifest",
  "/hub-sw.js",
]

const exportKinds = ["invoices", "payments", "expenses", "settlements", "1099", "pnl"]

function cookieHeader(cookies) {
  return cookies.map((cookie) => cookie.split(";")[0]).filter(Boolean).join("; ")
}

async function expectOk(path, options = {}) {
  const res = await fetch(`${baseUrl}${path}`, { redirect: "manual", ...options })
  if (res.status < 200 || res.status >= 400) {
    throw new Error(`${path} returned ${res.status}${res.headers.get("location") ? ` → ${res.headers.get("location")}` : ""}`)
  }
  return res
}

async function signIn() {
  const csrfRes = await expectOk("/api/auth/csrf")
  const csrfCookies = csrfRes.headers.getSetCookie?.() ?? []
  const csrf = await csrfRes.json()
  const body = new URLSearchParams({
    email,
    password,
    csrfToken: csrf.csrfToken,
    callbackUrl: `${baseUrl}/hub`,
    json: "true",
  })
  const loginRes = await fetch(`${baseUrl}/api/auth/callback/credentials`, {
    method: "POST",
    redirect: "manual",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      cookie: cookieHeader(csrfCookies),
    },
    body,
  })
  const cookies = [...csrfCookies, ...(loginRes.headers.getSetCookie?.() ?? [])]
  const header = cookieHeader(cookies)
  if (!header.includes("authjs.session-token")) throw new Error("Sign-in did not produce authjs session cookie")
  return header
}

async function main() {
  console.log(`HaulDesk E2E sweep: ${baseUrl}`)
  const cookie = await signIn()
  console.log("✓ sandbox owner sign-in")

  for (const path of officePaths) {
    await expectOk(path, { headers: { cookie } })
    console.log(`✓ ${path}`)
  }

  const driverCookie = await signInDriver()
  for (const path of publicPaths.filter((path) => path.startsWith("/hub/driver"))) {
    await expectOk(path, { headers: { cookie: driverCookie } })
    console.log(`✓ ${path}`)
  }

  for (const path of publicPaths.filter((path) => !path.startsWith("/hub/driver"))) {
    await expectOk(path)
    console.log(`✓ ${path}`)
  }

  for (const kind of exportKinds) {
    const res = await expectOk(`/api/hub/exports/${kind}`, { headers: { cookie } })
    const csv = await res.text()
    if (!csv.includes(",")) throw new Error(`Export ${kind} did not look like CSV`)
    console.log(`✓ export ${kind}`)
  }

  console.log("Sweep complete.")
}

async function signInDriver() {
  const oldEmail = process.env.HAULDESK_E2E_EMAIL
  const oldPassword = process.env.HAULDESK_E2E_PASSWORD
  process.env.HAULDESK_E2E_EMAIL = "driver@sandbox.hauldesk.local"
  process.env.HAULDESK_E2E_PASSWORD = "SandboxDriver1!"
  try {
    const csrfRes = await expectOk("/api/auth/csrf")
    const csrfCookies = csrfRes.headers.getSetCookie?.() ?? []
    const csrf = await csrfRes.json()
    const body = new URLSearchParams({
      email: process.env.HAULDESK_E2E_EMAIL,
      password: process.env.HAULDESK_E2E_PASSWORD,
      csrfToken: csrf.csrfToken,
      callbackUrl: `${baseUrl}/hub/driver`,
      json: "true",
    })
    const loginRes = await fetch(`${baseUrl}/api/auth/callback/credentials`, {
      method: "POST",
      redirect: "manual",
      headers: { "content-type": "application/x-www-form-urlencoded", cookie: cookieHeader(csrfCookies) },
      body,
    })
    const cookies = [...csrfCookies, ...(loginRes.headers.getSetCookie?.() ?? [])]
    const header = cookieHeader(cookies)
    if (!header.includes("authjs.session-token")) throw new Error("Driver sign-in did not produce authjs session cookie")
    return header
  } finally {
    if (oldEmail == null) delete process.env.HAULDESK_E2E_EMAIL
    else process.env.HAULDESK_E2E_EMAIL = oldEmail
    if (oldPassword == null) delete process.env.HAULDESK_E2E_PASSWORD
    else process.env.HAULDESK_E2E_PASSWORD = oldPassword
  }
}

main().catch((error) => {
  console.error(`Sweep failed: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
