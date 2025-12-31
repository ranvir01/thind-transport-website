import { NextResponse } from "next/server"
import { setupDatabase } from "@/lib/db-setup"

export async function GET() {
  try {
    await setupDatabase()
    return NextResponse.json({ 
      success: true, 
      message: "Database setup complete" 
    })
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}

