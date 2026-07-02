import NextAuth from "next-auth"
import type { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcrypt"
import { findDriverByEmail } from "@/lib/driver-db"
import { findHubUserByEmail } from "@/lib/hub/users"

export const authConfig = {
  trustHost: true, // Required for Vercel production deployments
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // Security pass (Phase 7): 5 failures in 15 minutes locks the email
        // for 15 minutes. DB-backed so it holds on serverless.
        const email = credentials.email as string
        const { isLockedOut, recordAttempt } = await import("@/lib/hub/auth-throttle")
        if (await isLockedOut(email)) {
          return null
        }

        // Go-live gate: HUB_DEMO_LOGIN=false refuses the seeded demo accounts
        // outright — the login-screen hint is hidden by the same flag.
        const { demoLoginEnabled, isDemoEmail } = await import("@/lib/hub/demo")
        if (isDemoEmail(email) && !demoLoginEnabled()) {
          return null
        }

        // Hub accounts (office staff, hub drivers, broker/shipper portals) take
        // precedence; the legacy driver-portal store is the fallback.
        const hubUser = await findHubUserByEmail(email)
        if (hubUser) {
          const valid = await bcrypt.compare(credentials.password as string, hubUser.password_hash)
          await recordAttempt(email, valid)
          if (!valid) return null
          return {
            id: hubUser.id,
            email: hubUser.email,
            name: hubUser.name,
            role: hubUser.role,
            carrierId: hubUser.carrier_id,
          } as { id: string; email: string; name: string; role: string; carrierId: string | null }
        }

        const driver = await findDriverByEmail(credentials.email as string)
        
        if (!driver) {
          await recordAttempt(email, false)
          return null
        }
        
        // Handle both camelCase and snake_case from Postgres
        const passwordHash = driver.passwordHash || (driver as any).password_hash
        
        if (!passwordHash) {
          return null
        }
        
        const isValidPassword = await bcrypt.compare(
          credentials.password as string,
          passwordHash
        )

        await recordAttempt(email, isValidPassword)
        if (!isValidPassword) {
          return null
        }

        // Handle both camelCase and snake_case for names
        const firstName = driver.firstName || (driver as any).first_name || ''
        const lastName = driver.lastName || (driver as any).last_name || ''
        
        return {
          id: driver.id,
          email: driver.email,
          name: `${firstName} ${lastName}`.trim() || driver.email,
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/driver/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role?: string }).role ?? null
        token.carrierId = (user as { carrierId?: string }).carrierId ?? null
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id
        ;(session.user as any).role = token.role ?? null
        ;(session.user as any).carrierId = token.carrierId ?? null
      }
      return session
    },
  },
} satisfies NextAuthConfig

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
export const { GET, POST } = handlers
