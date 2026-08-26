import { NextRequest, NextResponse } from "next/server"
import { setupDatabase } from "@/lib/db-setup"

/**
 * One-time database initialization endpoint.
 * Requires a bearer token matching SETUP_DB_TOKEN — disabled when the env var is unset.
 */
export async function GET(request: NextRequest) {
  const token = process.env.SETUP_DB_TOKEN
  const authHeader = request.headers.get("authorization")

  if (!token || authHeader !== `Bearer ${token}`) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  try {
    await setupDatabase()
    return NextResponse.json({
      success: true,
      message: "Database setup complete",
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database setup failed"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
