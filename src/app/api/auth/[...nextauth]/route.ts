import NextAuth from "next-auth"
import type { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcrypt"
import { findDriverByEmail } from "@/lib/driver-db"

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
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id
      }
      return session
    },
  },
} satisfies NextAuthConfig

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
export const { GET, POST } = handlers
