import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"
import { hubLandingPath, LEGACY_DRIVER_HOME } from "@/lib/hub/landing"
import { isAppHost } from "@/lib/app-origin"
import { appHostRewrite } from "@/lib/app-host-routing"

export default async function proxy(request: NextRequest) {
  // On the app's own origin the app owns the root: "/" and "/dispatch" are
  // served by the /hub routes without the segment showing up in the URL, so
  // the manifest can claim scope "/" and every page on the origin is the app.
  // Returns null on the marketing origin, or when APP_HOST is unset — which is
  // the default, and why this is inert until someone configures a domain.
  const onAppHost = isAppHost(request.headers.get("host"))
  const rewriteTo = onAppHost ? appHostRewrite(request.nextUrl.pathname) : null
  if (rewriteTo) {
    // Rewrite, not redirect: the browser keeps the clean URL and Next resolves
    // the /hub route behind it. The rewritten path then falls through to the
    // auth gate below, so the app origin is protected exactly as /hub is.
    const url = request.nextUrl.clone()
    url.pathname = rewriteTo
    return authGate(request, rewriteTo, NextResponse.rewrite(url))
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
  // The matcher now covers every route so the app origin's root can be
  // rewritten, which means marketing pages run through here too. Reading the
  // session is the expensive part, so it happens only for the paths that gate
  // on it — a visitor on /pay-rates never pays for a JWT verify.
  const gated =
    pathname.startsWith("/driver") || pathname.startsWith("/hub")
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
      return NextResponse.redirect(new URL("/driver/login", request.url))
    }
  }

  // Redirect to application if already logged in and trying to access login/register
  if ((pathname === "/driver/login" || pathname === "/driver/register") && token) {
    return NextResponse.redirect(new URL("/driver/application", request.url))
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
    pathname === "/hub/get-app"
  ) {
    return passthrough ?? NextResponse.next()
  }
  if (pathname.startsWith("/hub") && pathname !== "/hub/login") {
    const role = (token as { role?: string } | null)?.role
    if (!token) {
      return NextResponse.redirect(new URL("/hub/login", request.url))
    }
    if (!role) {
      // Legacy driver-portal account: signed in but no hub.role on the token.
      // Sending it to /hub/login just bounced forever — its home is the
      // original driver portal.
      return NextResponse.redirect(new URL(LEGACY_DRIVER_HOME, request.url))
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
        return NextResponse.redirect(new URL("/hub/driver", request.url))
      }
    } else if (role === "broker" || role === "shipper") {
      // External accounts live in the portal — nothing else, but /hub/suspended
      // needs the same exemption as the driver branch above.
      if (!inPortal && !pathname.startsWith("/hub/welcome") && !pathname.startsWith("/hub/suspended")) {
        return NextResponse.redirect(new URL("/hub/portal", request.url))
      }
    } else if (role === "platform_admin") {
      // Platform admins see tenant ops only — never a tenant's business data.
      if (!pathname.startsWith("/hub/admin")) {
        return NextResponse.redirect(new URL("/hub/admin", request.url))
      }
    } else if (!officeRoles.includes(role) && !pathname.startsWith("/hub/welcome")) {
      return NextResponse.redirect(new URL("/hub/welcome", request.url))
    } else if (officeRoles.includes(role) && (inDriverApp || inPortal)) {
      // Office accounts don't impersonate drivers or customers.
      return NextResponse.redirect(new URL("/hub", request.url))
    }
  }

  if (pathname === "/hub/login" && token) {
    const role = (token as { role?: string }).role
    return NextResponse.redirect(
      new URL(role ? hubLandingPath(role) : LEGACY_DRIVER_HOME, request.url)
    )
  }

  return passthrough ?? NextResponse.next()
}

export const config = {
  // Everything except framework assets: the app origin's "/" has to reach this
  // middleware to be rewritten, and a matcher limited to /driver and /hub never
  // sees it. The gated-path check above keeps the cost off marketing routes.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
