import NextAuth from "next-auth"
import type { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcrypt"
import { findDriverByEmail } from "@/lib/driver-db"
import { findHubUserByEmail } from "@/lib/hub/users"

const SANDBOX_AUTH = [
  {
    email: "owner@sandbox.hauldesk.local",
    password: "SandboxOwner1!",
    name: "Sandbox Owner",
    role: "owner",
  },
  {
    email: "dispatch@sandbox.hauldesk.local",
    password: "SandboxDispatch1!",
    name: "Sandbox Dispatcher",
    role: "dispatcher",
  },
  {
    email: "driver@sandbox.hauldesk.local",
    password: "SandboxDriver1!",
    name: "Sandbox Driver",
    role: "driver",
  },
] as const

const SANDBOX_CARRIER_IDS = [
  "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
]

export const authConfig = {
  trustHost: true, // Required for Vercel production deployments
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        totpCode: { label: "2FA code", type: "text" },
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
          // Second factor, when the account has one: a TOTP code or an
          // unused recovery code, from the always-present optional field.
          // A wrong/missing code fails like a wrong password — counted by
          // the same throttle, and revealing nothing about whether 2FA is
          // on for this email.
          const { totpEnabled, verifyLoginTotp } = await import("@/lib/hub/totp-store")
          if (await totpEnabled(hubUser.id)) {
            const second = await verifyLoginTotp(hubUser.id, (credentials.totpCode as string) ?? "")
            await recordAttempt(email, second.ok)
            if (!second.ok) return null
          }
          return {
            id: hubUser.id,
            email: hubUser.email,
            name: hubUser.name,
            role: hubUser.role,
            carrierId: hubUser.carrier_id,
            allowedCarrierIds: hubUser.allowed_carrier_ids ?? (hubUser.carrier_id ? [hubUser.carrier_id] : []),
            dataMode: hubUser.data_mode ?? "production",
          } as {
            id: string
            email: string
            name: string
            role: string
            carrierId: string | null
            allowedCarrierIds: string[]
            dataMode: string
          }
        }

        // Mobile tunnel smoke can run before a local Postgres is configured.
        // Real sandbox records still come from npm run seed:sandbox when
        // POSTGRES_URL exists; this fallback only unlocks /hub/driver PWA
        // camera/service-worker verification in local HTTPS dev.
        if (!process.env.POSTGRES_URL) {
          const sandbox = SANDBOX_AUTH.find((entry) => entry.email === String(credentials.email).toLowerCase())
          if (sandbox && credentials.password === sandbox.password) {
            return {
              id: `local-${sandbox.role}`,
              email: sandbox.email,
              name: sandbox.name,
              role: sandbox.role,
              carrierId: SANDBOX_CARRIER_IDS[0],
              allowedCarrierIds: SANDBOX_CARRIER_IDS,
              dataMode: "sandbox",
            } as {
              id: string
              email: string
              name: string
              role: string
              carrierId: string
              allowedCarrierIds: string[]
              dataMode: string
            }
          }
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
        token.allowedCarrierIds = (user as { allowedCarrierIds?: string[] }).allowedCarrierIds ?? []
        token.dataMode = (user as { dataMode?: string }).dataMode ?? null
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id
        ;(session.user as any).role = token.role ?? null
        ;(session.user as any).carrierId = token.carrierId ?? null
        ;(session.user as any).allowedCarrierIds = token.allowedCarrierIds ?? []
        ;(session.user as any).dataMode = token.dataMode ?? null
      }
      return session
    },
  },
} satisfies NextAuthConfig

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
export const { GET, POST } = handlers
