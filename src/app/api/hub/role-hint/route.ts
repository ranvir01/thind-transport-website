import { NextResponse } from "next/server"
import { findHubUserByEmail } from "@/lib/hub/users"
import { hubRoleLabel } from "@/lib/hub/landing"

/** Read-only role hint for the login page after the user types their email. */
export async function GET(request: Request) {
  const email = new URL(request.url).searchParams.get("email")?.trim()
  if (!email || !email.includes("@")) {
    return NextResponse.json({ role: null, label: null })
  }
  const user = await findHubUserByEmail(email)
  if (!user) return NextResponse.json({ role: null, label: null })
  return NextResponse.json({ role: user.role, label: hubRoleLabel(user.role) })
}
