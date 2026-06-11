import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

export default async function proxy(request: NextRequest) {
  // NextAuth prefixes the cookie with __Secure- only when running over HTTPS,
  // so derive the name from the actual protocol — not NODE_ENV. (Using NODE_ENV
  // broke local production builds and any http deployment.)
  const useSecureCookies =
    request.nextUrl.protocol === "https:" ||
    (process.env.NEXTAUTH_URL ?? "").startsWith("https://")

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: useSecureCookies ? '__Secure-authjs.session-token' : 'authjs.session-token',
  })

  const { pathname } = request.nextUrl

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
  // Invitation-accept pages are public by design (token-gated server-side).
  if (pathname.startsWith("/hub/portal/accept")) {
    return NextResponse.next()
  }
  if (pathname.startsWith("/hub") && pathname !== "/hub/login") {
    const role = (token as { role?: string } | null)?.role
    if (!token || !role) {
      return NextResponse.redirect(new URL("/hub/login", request.url))
    }
    const officeRoles = ["owner", "dispatcher", "accountant"]
    // NOTE: /hub/driver (the driver app) vs /hub/drivers (office roster).
    const inDriverApp = pathname === "/hub/driver" || pathname.startsWith("/hub/driver/")
    const inPortal = pathname === "/hub/portal" || pathname.startsWith("/hub/portal/")
    if (role === "driver") {
      // Drivers live in the driver app; the API routes stay shared.
      if (!inDriverApp && !pathname.startsWith("/hub/welcome")) {
        return NextResponse.redirect(new URL("/hub/driver", request.url))
      }
    } else if (role === "broker" || role === "shipper") {
      // External accounts live in the portal — nothing else.
      if (!inPortal && !pathname.startsWith("/hub/welcome")) {
        return NextResponse.redirect(new URL("/hub/portal", request.url))
      }
    } else if (!officeRoles.includes(role) && !pathname.startsWith("/hub/welcome")) {
      return NextResponse.redirect(new URL("/hub/welcome", request.url))
    } else if (officeRoles.includes(role) && (inDriverApp || inPortal)) {
      // Office accounts don't impersonate drivers or customers.
      return NextResponse.redirect(new URL("/hub", request.url))
    }
  }

  if (pathname === "/hub/login" && (token as { role?: string } | null)?.role) {
    return NextResponse.redirect(new URL("/hub", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/driver/:path*", "/hub/:path*"],
}
