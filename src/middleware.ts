import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: process.env.NODE_ENV === 'production' 
      ? '__Secure-authjs.session-token' 
      : 'authjs.session-token',
  })

  const { pathname } = request.nextUrl

  // Protect driver routes
  if (pathname.startsWith("/driver/application") || pathname.startsWith("/driver/dashboard")) {
    if (!token) {
      return NextResponse.redirect(new URL("/driver/login", request.url))
    }
  }

  // Redirect to application if already logged in and trying to access login/register
  if ((pathname === "/driver/login" || pathname === "/driver/register") && token) {
    return NextResponse.redirect(new URL("/driver/application", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/driver/:path*"],
}

