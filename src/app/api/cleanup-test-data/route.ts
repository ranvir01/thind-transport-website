/**
 * Cleanup endpoint to remove test/development driver accounts
 * Use this to clear out old test data before fresh testing
 */

import { NextResponse } from "next/server"
import { sql } from "@vercel/postgres"

export async function GET() {
  try {
    // Delete test accounts (with invitation code THIND-2026)
    // This removes the old migrated account so you can register fresh
    const result = await sql`
      DELETE FROM drivers 
      WHERE email = 'rjkind01@gmail.com'
      RETURNING email
    `

    console.log("✓ Deleted test accounts:", result.rows)

    return NextResponse.json({ 
      success: true, 
      message: "Test data cleaned up successfully",
      deletedCount: result.rowCount,
      deletedEmails: result.rows.map(r => r.email)
    })
  } catch (error: any) {
    console.error("Cleanup error:", error)
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}

