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

        // Hub accounts (office staff, hub drivers, broker/shipper portals) take
        // precedence; the legacy driver-portal store is the fallback.
        const hubUser = await findHubUserByEmail(credentials.email as string)
        if (hubUser) {
          const valid = await bcrypt.compare(credentials.password as string, hubUser.password_hash)
          if (!valid) return null
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

        const driver = await findDriverByEmail(credentials.email as string)
        
        if (!driver) {
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
