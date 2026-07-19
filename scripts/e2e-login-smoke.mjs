/**
 * E2E smoke: /hub/login routing for every account class — especially a
 * session token WITHOUT hub.role (legacy driver-portal account), which used
 * to bounce login → /hub → /hub/login forever (fixed by routing roleless
 * tokens to /driver/application in src/proxy.ts).
 *
 * The legacy credentials lookup (drivers table) now runs on node-postgres
 * and works locally, but this smoke still mints a roleless session cookie
 * with the server's own NEXTAUTH_SECRET: it exercises the proxy routing —
 * the fixed layer — without needing a seeded legacy driver account.
 *
 * Prereqs: server running (see e2e-lib.mjs header), NEXTAUTH_SECRET (or
 * AUTH_SECRET) matching the server. Hub demo logins come from seed-demo.mjs.
 *
 * Run: node scripts/e2e-login-smoke.mjs
 */
import { encode } from "next-auth/jwt"
import { launchBrowser, BASE, login, check, failures } from "./e2e-lib.mjs"

const SECRET = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET
if (!SECRET) {
  console.error("NEXTAUTH_SECRET (or AUTH_SECRET) required — must match the running server")
  process.exit(1)
}

/** Mint a session cookie the way authorize() does for legacy accounts: no role. */
async function rolelessSessionCookie() {
  const cookieName = BASE.startsWith("https")
    ? "__Secure-authjs.session-token"
    : "authjs.session-token"
  const value = await encode({
    token: { id: "e2e-legacy-driver", email: "legacy@driver.test", role: null, carrierId: null },
    secret: SECRET,
    salt: cookieName,
    maxAge: 60 * 60,
  })
  const { hostname } = new URL(BASE)
  return { name: cookieName, value, domain: hostname, path: "/", httpOnly: true }
}

async function main() {
  const browser = await launchBrowser()

  console.log("1. Roleless (legacy driver-portal) session — must not bounce back to /hub/login")
  {
    // Own context: the roleless cookie must not leak into the demo logins below.
    const ctx = await browser.createBrowserContext()
    const page = await ctx.newPage()
    await page.setViewport({ width: 390, height: 844 })
    await page.setCookie(await rolelessSessionCookie())

    await page.goto(`${BASE}/hub`, { waitUntil: "networkidle2" })
    const hubVisit = new URL(page.url()).pathname
    check(hubVisit.startsWith("/driver/application"), `/hub visit routed to legacy portal (got ${hubVisit})`)

    await page.goto(`${BASE}/hub/login`, { waitUntil: "networkidle2" })
    const loginVisit = new URL(page.url()).pathname
    check(loginVisit.startsWith("/driver/application"), `/hub/login routed away, no loop (got ${loginVisit})`)

    await page.goto(`${BASE}/hub/loadboard`, { waitUntil: "networkidle2" })
    const officeVisit = new URL(page.url()).pathname
    check(officeVisit.startsWith("/driver/application"), `office screen refused for roleless token (got ${officeVisit})`)
    await ctx.close()
  }

  console.log("2. Office + hub-driver demo logins still land on their role homes")
  {
    const ctx = await browser.createBrowserContext()
    const page = await ctx.newPage()
    await page.setViewport({ width: 1440, height: 900 })
    await login(page, "dispatch@demo.thind")
    const p = new URL(page.url()).pathname
    check(p === "/hub/loadboard", `dispatcher lands on /hub/loadboard (got ${p})`)
    await ctx.close()
  }
  {
    const ctx = await browser.createBrowserContext()
    const page = await ctx.newPage()
    await page.setViewport({ width: 390, height: 844 })
    await login(page, "driver@demo.thind")
    const p = new URL(page.url()).pathname
    check(p.startsWith("/hub/driver"), `hub driver lands on /hub/driver (got ${p})`)
    await ctx.close()
  }

  await browser.close()
  if (failures.length) {
    console.error(`\n❌ ${failures.length} failed: ${failures.join(" | ")}`)
    process.exit(1)
  }
  console.log("\n✅ All login routing checks passed.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
