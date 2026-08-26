import { NextResponse } from "next/server"
import bcrypt from "bcrypt"
import { createDriver, verifyInvitationCode, hasPublicApplication } from "@/lib/driver-db"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { firstName, lastName, email, phone, password, invitationCode } = body

    // Validate required fields (invitation code is optional — see below)
    if (!firstName || !lastName || !email || !phone || !password) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      )
    }

    if (typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      )
    }

    // Two ways in:
    //  1. A valid invitation code from a recruiter
    //  2. The email already submitted an application through the website
    let authorized = false
    if (invitationCode) {
      authorized = await verifyInvitationCode(invitationCode)
    }
    if (!authorized) {
      authorized = await hasPublicApplication(email)
    }
    if (!authorized) {
      return NextResponse.json(
        {
          error:
            "We couldn't verify your invitation. Use the same email you applied with on our website, or enter the code from your recruiter.",
        },
        { status: 400 }
      )
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // Create driver account
    const driver = await createDriver({
      email: email.toLowerCase(),
      passwordHash,
      firstName,
      lastName,
      phone,
      invitationCode: invitationCode || "WEB-APPLICANT",
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
  } catch (error: unknown) {
    console.error("Registration error:", error)

    if (error instanceof Error && error.message === "Email already registered") {
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
