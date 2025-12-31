import NextAuth from "next-auth"
import type { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcrypt"
import { findDriverByEmail } from "@/lib/driver-db"

export const authConfig = {
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.log("❌ Missing credentials")
          return null
        }

        console.log("🔍 Looking up driver:", credentials.email)
        const driver = await findDriverByEmail(credentials.email as string)
        
        if (!driver) {
          console.log("❌ Driver not found in database:", credentials.email)
          return null
        }

        console.log("✓ Driver found:", driver.email, driver.id)

        const isValidPassword = await bcrypt.compare(
          credentials.password as string,
          driver.passwordHash
        )

        if (!isValidPassword) {
          console.log("❌ Invalid password for:", credentials.email)
          return null
        }

        console.log("✓ Login successful for:", credentials.email)
        return {
          id: driver.id,
          email: driver.email,
          name: `${driver.firstName} ${driver.lastName}`,
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
