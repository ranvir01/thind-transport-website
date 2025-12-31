import { NextResponse } from "next/server"
import bcrypt from "bcrypt"
import { createDriver, verifyInvitationCode } from "@/lib/driver-db"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { firstName, lastName, email, phone, password, invitationCode } = body

    // Validate required fields
    if (!firstName || !lastName || !email || !phone || !password || !invitationCode) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      )
    }

    // Verify invitation code
    const isValidCode = await verifyInvitationCode(invitationCode)
    if (!isValidCode) {
      return NextResponse.json(
        { error: "Invalid invitation code" },
        { status: 400 }
      )
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // Create driver account
    const driver = await createDriver({
      email,
      passwordHash,
      firstName,
      lastName,
      phone,
      invitationCode,
    })

    return NextResponse.json({
      success: true,
      driver: {
        id: driver.id,
        email: driver.email,
        firstName: driver.firstName,
        lastName: driver.lastName,
      },
    })
  } catch (error: any) {
    console.error("Registration error:", error)
    
    if (error.message === "Email already registered") {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    )
  }
}

