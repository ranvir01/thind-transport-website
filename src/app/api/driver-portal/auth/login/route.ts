import { NextRequest, NextResponse } from 'next/server'

/**
 * Driver Portal Login API
 * 
 * This endpoint handles driver authentication.
 * In production, connect this to your trucking software:
 * - Samsara: OAuth 2.0 authentication
 * - Motive (KeepTruckin): API key + driver credentials
 * - Custom TMS: Your own auth system
 * 
 * Environment Variables Required:
 * - TRUCKING_API_KEY: Your trucking software API key
 * - TRUCKING_API_URL: Base URL for trucking software API
 * - JWT_SECRET: Secret for signing JWT tokens
 */

// Demo credentials for testing
const DEMO_DRIVERS = [
  {
    id: "D001",
    driverId: "TT-4521",
    email: "jwilson@thindtransport.com",
    firstName: "James",
    lastName: "Wilson",
    password: "demo123", // In production, this would be hashed
    status: "active",
    truckId: "TRK-892",
    trailerId: "TRL-445",
    cdlNumber: "WDL123456",
    cdlState: "WA",
    cdlExpiration: "2026-08-15",
    medicalCardExpiration: "2025-01-20",
    hireDate: "2022-03-15",
    homeTerminal: "Kent, WA",
    safetyScore: 98,
  }
]

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { driverIdOrEmail, password, rememberMe } = body

    // Validate input
    if (!driverIdOrEmail || !password) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'INVALID_INPUT', 
            message: 'Driver ID/Email and password are required' 
          } 
        },
        { status: 400 }
      )
    }

    // In production: Connect to your trucking software API here
    // Example for Samsara:
    // const samsaraResponse = await fetch('https://api.samsara.com/v1/drivers/authenticate', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${process.env.SAMSARA_API_KEY}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({ email: driverIdOrEmail, password }),
    // })

    // Demo: Find driver by ID or email
    const driver = DEMO_DRIVERS.find(
      d => d.driverId.toLowerCase() === driverIdOrEmail.toLowerCase() ||
           d.email.toLowerCase() === driverIdOrEmail.toLowerCase()
    )

    // For demo, accept any password or match demo password
    if (!driver) {
      // In demo mode, create a session for any credentials
      // In production, return authentication error
      const demoDriver = DEMO_DRIVERS[0]
      
      // Generate tokens (in production, use proper JWT signing)
      const accessToken = generateDemoToken(demoDriver.id, '24h')
      const refreshToken = generateDemoToken(demoDriver.id, '7d')

      return NextResponse.json({
        success: true,
        data: {
          driver: {
            id: demoDriver.id,
            driverId: demoDriver.driverId,
            firstName: demoDriver.firstName,
            lastName: demoDriver.lastName,
            email: demoDriver.email,
            status: demoDriver.status,
            truckId: demoDriver.truckId,
            trailerId: demoDriver.trailerId,
            cdlNumber: demoDriver.cdlNumber,
            cdlState: demoDriver.cdlState,
            cdlExpiration: demoDriver.cdlExpiration,
            medicalCardExpiration: demoDriver.medicalCardExpiration,
            hireDate: demoDriver.hireDate,
            homeTerminal: demoDriver.homeTerminal,
            safetyScore: demoDriver.safetyScore,
          },
          accessToken,
          refreshToken,
          expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
        }
      })
    }

    // Generate tokens
    const accessToken = generateDemoToken(driver.id, '24h')
    const refreshToken = generateDemoToken(driver.id, '7d')

    return NextResponse.json({
      success: true,
      data: {
        driver: {
          id: driver.id,
          driverId: driver.driverId,
          firstName: driver.firstName,
          lastName: driver.lastName,
          email: driver.email,
          status: driver.status,
          truckId: driver.truckId,
          trailerId: driver.trailerId,
          cdlNumber: driver.cdlNumber,
          cdlState: driver.cdlState,
          cdlExpiration: driver.cdlExpiration,
          medicalCardExpiration: driver.medicalCardExpiration,
          hireDate: driver.hireDate,
          homeTerminal: driver.homeTerminal,
          safetyScore: driver.safetyScore,
        },
        accessToken,
        refreshToken,
        expiresAt: Date.now() + (rememberMe ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000),
      }
    })

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'SERVER_ERROR', 
          message: 'An error occurred during authentication' 
        } 
      },
      { status: 500 }
    )
  }
}

// Demo token generator - replace with proper JWT in production
function generateDemoToken(driverId: string, expiry: string): string {
  const payload = {
    sub: driverId,
    iat: Date.now(),
    exp: expiry,
    demo: true,
  }
  // In production, use jsonwebtoken library:
  // return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: expiry })
  return Buffer.from(JSON.stringify(payload)).toString('base64')
}











