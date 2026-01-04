import NextAuth from "next-auth"
import type { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcrypt"
import { findDriverByEmail } from "@/lib/driver-db"

export const authConfig = {
  trustHost: true, // Required for Vercel production deployments
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' 
        ? '__Secure-next-auth.session-token' 
        : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax' as const,
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // #region agent log
        const logToDebug = async (msg: string, data: any, hyp: string) => {
          try {
            await fetch('http://127.0.0.1:7243/ingest/4bd64d0b-61fc-4eff-91ed-d2f6838af806',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'nextauth/authorize',message:msg,data,timestamp:Date.now(),sessionId:'debug-session',hypothesisId:hyp})});
          } catch {}
        };
        // #endregion

        if (!credentials?.email || !credentials?.password) {
          await logToDebug('Missing credentials', {hasEmail:!!credentials?.email,hasPass:!!credentials?.password}, 'H1');
          return null
        }

        await logToDebug('Looking up driver', {email:credentials.email}, 'H5');
        const driver = await findDriverByEmail(credentials.email as string)
        
        if (!driver) {
          await logToDebug('Driver not found', {email:credentials.email}, 'H5');
          return null
        }

        await logToDebug('Driver found', {email:driver.email,id:driver.id,keys:Object.keys(driver),hasPasswordHash:!!driver.passwordHash,hasSnakeCase:!!(driver as any).password_hash}, 'H1,H5');
        
        // Handle both camelCase and snake_case from Postgres
        const passwordHash = driver.passwordHash || (driver as any).password_hash
        
        if (!passwordHash) {
          await logToDebug('No password hash found', {driverKeys:Object.keys(driver)}, 'H1');
          return null
        }

        await logToDebug('About to compare password', {hashLength:passwordHash?.length,hashPrefix:passwordHash?.substring(0,10)}, 'H1');
        
        const isValidPassword = await bcrypt.compare(
          credentials.password as string,
          passwordHash
        )

        await logToDebug('Password comparison result', {isValid:isValidPassword}, 'H1');

        if (!isValidPassword) {
          await logToDebug('Invalid password', {email:credentials.email}, 'H1');
          return null
        }

        // Handle both camelCase and snake_case for names
        const firstName = driver.firstName || (driver as any).first_name || ''
        const lastName = driver.lastName || (driver as any).last_name || ''
        
        await logToDebug('Login successful - returning user', {id:driver.id,email:driver.email,firstName,lastName}, 'H1,H3');
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
