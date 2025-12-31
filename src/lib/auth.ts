import { auth as nextAuth } from "@/app/api/auth/[...nextauth]/route"

export async function auth() {
  return await nextAuth()
}

export async function requireAuth() {
  const session = await auth()
  if (!session?.user) {
    throw new Error("Unauthorized")
  }
  return session
}

