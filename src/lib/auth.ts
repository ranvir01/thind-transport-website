import { auth as nextAuth } from "@/app/api/auth/[...nextauth]/route"

export async function auth() {
  return await nextAuth()
}

