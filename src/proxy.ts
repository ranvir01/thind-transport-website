import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"
import { hubLandingPath, LEGACY_DRIVER_HOME } from "@/lib/hub/landing"
import { isAppHost } from "@/lib/app-origin"
import { appHostLanding, inSegment } from "@/lib/app-host-routing"

export default async function proxy(request: NextRequest) {
  // On the app's own origin the root IS the app, so "/" goes to /hub rather
  // than the carrier's homepage. Only the root moves — see app-host-routing.ts
  // for why rewriting every path was the wrong trade. Inert on the marketing
  // origin and when APP_HOST is unset, which is the default.
  if (isAppHost(request.headers.get("host"))) {
    const landing = appHostLanding(request.nextUrl.pathname)
    if (landing) return NextResponse.redirect(new URL(landing, request.url))
  }
  return authGate(request, request.nextUrl.pathname, null)
}

/**
 * The original gate, unchanged in behaviour — it just takes the path to judge
 * and the response to hand back when nothing blocks. Splitting it out is what
 * lets the app origin reuse the identical rules rather than a parallel copy
 * that drifts.
 */
async function authGate(
  request: NextRequest,
  pathname: string,
  passthrough: NextResponse | null
) {
  const goTo = (path: string) => NextResponse.redirect(new URL(path, request.url))

  // The matcher now covers every route so the app origin's root can be
  // rewritten, which means marketing pages run through here too. Reading the
  // session is the expensive part, so it happens only for the paths that gate
  // on it — a visitor on /pay-rates never pays for a JWT verify.
  // Match on the route SEGMENT, not a bare prefix: the PWA ships static assets
  // named `/hub-sw.js`, `/hub-icon-192.png`, `/hub.webmanifest`, `/hub-icon.svg`
  // (and `/hub-icon-512*.png`) at the origin root. A bare `startsWith("/hub")`
  // swept those into the auth gate and 307'd them to `/hub/login`, so the
  // service-worker fetch failed ("script resource is behind a redirect, which
  // is disallowed") and the manifest icons — fetched without credentials —
  // resolved to the login HTML ("resource isn't a valid image"): no offline
  // shell, no installability. Segment boundaries match app-host-routing.ts,
  // which shares the helper so the two can never drift apart.
  const gated = inSegment(pathname, "/driver") || inSegment(pathname, "/hub")
  if (!gated) return passthrough ?? NextResponse.next()

  // NextAuth prefixes the cookie with __Secure- only when running over HTTPS,
  // so derive the name from the actual protocol — not NODE_ENV. (Using NODE_ENV
  // broke local production builds and any http deployment.)
  const useSecureCookies =
    request.nextUrl.protocol === "https:" ||
    (process.env.NEXTAUTH_URL ?? "").startsWith("https://")

  const token = await getToken({
    req: request,
    // Auth.js v5 reads AUTH_SECRET; legacy deploys still set NEXTAUTH_SECRET.
    secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
    cookieName: useSecureCookies ? '__Secure-authjs.session-token' : 'authjs.session-token',
  })

  // Protect driver portal and internal admin tooling
  if (
    pathname.startsWith("/driver/application") ||
    pathname.startsWith("/driver/dashboard") ||
    pathname.startsWith("/driver/admin")
  ) {
    if (!token) {
      return goTo("/driver/login")
    }
  }

  // Redirect to application if already logged in and trying to access login/register
  if ((pathname === "/driver/login" || pathname === "/driver/register") && token) {
    return goTo("/driver/application")
  }

  // ---- Hub (operations system) ----
  // Public by design: invitation-accept (token-gated), self-serve signup, and
  // the install page — installability follows the manifest in scope, so the
  // page a driver installs FROM must live under /hub and be reachable without
  // a session (an iOS home-screen app starts with its own empty cookie jar).
  if (
    pathname.startsWith("/hub/portal/accept") ||
    pathname.startsWith("/hub/driver-invite/") ||
    pathname === "/hub/signup" ||
    pathname === "/hub/get-app" ||
    // The interactive product demo: fabricated data only, no tenant reads —
    // public so prospects (and the owner's phone) can run it pre-login.
    pathname === "/hub/demo" ||
    // The playable sandbox seat picker: public entry; picking a seat signs
    // you into the fabricated Blue Ridge Haulage tenant (lib/hub/sandbox.ts).
    pathname === "/hub/sandbox"
  ) {
    return passthrough ?? NextResponse.next()
  }
  if (inSegment(pathname, "/hub") && pathname !== "/hub/login") {
    const role = (token as { role?: string } | null)?.role
    if (!token) {
      return goTo("/hub/login")
    }
    if (!role) {
      // Legacy driver-portal account: signed in but no hub.role on the token.
      // Sending it to /hub/login just bounced forever — its home is the
      // original driver portal.
      return goTo(LEGACY_DRIVER_HOME)
    }
    const officeRoles = ["owner", "dispatcher", "accountant"]
    // NOTE: /hub/driver (the driver app) vs /hub/drivers (office roster).
    const inDriverApp = pathname === "/hub/driver" || pathname.startsWith("/hub/driver/")
    const inPortal = pathname === "/hub/portal" || pathname.startsWith("/hub/portal/")
    if (role === "driver") {
      // Drivers live in the driver app; the API routes stay shared. /hub/suspended
      // must stay reachable too — otherwise a suspended tenant's driver bounces
      // straight back to /hub/driver, which redirects to /hub/suspended, forever
      // (the same class of loop /hub/welcome is already exempted from).
      if (!inDriverApp && !pathname.startsWith("/hub/welcome") && !pathname.startsWith("/hub/suspended")) {
        return goTo("/hub/driver")
      }
    } else if (role === "broker" || role === "shipper") {
      // External accounts live in the portal — nothing else, but /hub/suspended
      // needs the same exemption as the driver branch above.
      if (!inPortal && !pathname.startsWith("/hub/welcome") && !pathname.startsWith("/hub/suspended")) {
        return goTo("/hub/portal")
      }
    } else if (role === "platform_admin") {
      // Platform admins see tenant ops only — never a tenant's business data.
      if (!pathname.startsWith("/hub/admin")) {
        return goTo("/hub/admin")
      }
    } else if (!officeRoles.includes(role) && !pathname.startsWith("/hub/welcome")) {
      return goTo("/hub/welcome")
    } else if (officeRoles.includes(role) && (inDriverApp || inPortal)) {
      // Office accounts don't impersonate drivers or customers.
      return goTo("/hub")
    }
  }

  if (pathname === "/hub/login" && token) {
    const role = (token as { role?: string }).role
    return goTo(role ? hubLandingPath(role) : LEGACY_DRIVER_HOME)
  }

  return passthrough ?? NextResponse.next()
}

export const config = {
  // Everything except framework assets: the app origin's "/" has to reach this
  // middleware to be rewritten, and a matcher limited to /driver and /hub never
  // sees it. The gated-path check above keeps the cost off marketing routes.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
