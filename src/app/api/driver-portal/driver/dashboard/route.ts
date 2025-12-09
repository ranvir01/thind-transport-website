import { NextRequest, NextResponse } from 'next/server'

/**
 * Driver Dashboard API
 * 
 * Returns aggregated dashboard data for the authenticated driver.
 * In production, this fetches from your trucking software APIs:
 * - Samsara: Driver details, vehicle info, HOS
 * - TMS: Current loads, settlements
 * - Document management system: Compliance status
 */

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Missing or invalid token' } },
        { status: 401 }
      )
    }

    // In production: Verify JWT token and get driver ID
    // const token = authHeader.split(' ')[1]
    // const decoded = jwt.verify(token, process.env.JWT_SECRET)
    // const driverId = decoded.sub

    // Demo dashboard data
    const dashboardData = {
      driver: {
        id: "D001",
        driverId: "TT-4521",
        firstName: "James",
        lastName: "Wilson",
        email: "jwilson@thindtransport.com",
        status: "active",
        truckId: "TRK-892",
        trailerId: "TRL-445",
        safetyScore: 98,
        hireDate: "2022-03-15",
        homeTerminal: "Kent, WA",
        cdlNumber: "WDL123456",
        cdlState: "WA",
        cdlExpiration: "2026-08-15",
        medicalCardExpiration: "2025-01-20",
      },
      currentLoad: {
        id: "L-78234",
        loadNumber: "TT-78234",
        status: "en_route_delivery",
        pickupLocation: {
          name: "Amazon Fulfillment Center",
          address: "123 Industrial Way",
          city: "Seattle",
          state: "WA",
          zipCode: "98101",
        },
        deliveryLocation: {
          name: "Target Distribution Center",
          address: "456 Commerce Blvd",
          city: "Los Angeles",
          state: "CA",
          zipCode: "90001",
        },
        pickupDate: "2024-12-01",
        deliveryDate: "2024-12-03",
        miles: 1135,
        rate: 3405,
        commodity: "Consumer Electronics",
        weight: 42000,
        customerName: "Amazon Logistics",
      },
      upcomingLoads: [],
      recentSettlements: [
        {
          id: "S-1234",
          settlementNumber: "2024-W47",
          periodStart: "2024-11-18",
          periodEnd: "2024-11-24",
          grossPay: 4250,
          netPay: 3825,
          status: "paid",
          totalMiles: 2840,
          totalLoads: 4,
        },
        {
          id: "S-1233",
          settlementNumber: "2024-W46",
          periodStart: "2024-11-11",
          periodEnd: "2024-11-17",
          grossPay: 3890,
          netPay: 3501,
          status: "paid",
          totalMiles: 2590,
          totalLoads: 3,
        },
      ],
      complianceAlerts: [
        {
          id: "C001",
          type: "medical_card",
          name: "Medical Card",
          status: "expiring_soon",
          expirationDate: "2025-01-20",
          daysUntilExpiration: 50,
          requiredAction: "Schedule DOT physical exam",
        },
      ],
      unreadMessages: 2,
      unreadNotifications: 3,
      eldStatus: {
        currentStatus: "driving",
        statusSince: new Date().toISOString(),
        cycleType: "70_8",
        hoursAvailable: 62,
        hoursUsedToday: 6.75,
        driveTimeRemaining: 255, // 4:15 in minutes
        shiftTimeRemaining: 435, // 7:15 in minutes
        breakRequired: false,
        violations: [],
      },
      fuelCardBalance: {
        cardNumber: "****4521",
        availableBalance: 2500,
        creditLimit: 5000,
        lastUpdated: new Date().toISOString(),
      },
      stats: {
        periodStart: "2024-11-01",
        periodEnd: "2024-11-30",
        totalMiles: 11240,
        loadedMiles: 10670,
        emptyMiles: 570,
        emptyMilesPercent: 5.1,
        grossEarnings: 16480,
        netEarnings: 14832,
        avgRevenuePerMile: 1.47,
        loadsCompleted: 14,
        onTimeDeliveryRate: 98.5,
        totalFuelSpent: 3240,
        avgMpg: 7.2,
        totalGallons: 1561,
        safetyScore: 98,
        hardBrakes: 2,
        rapidAccel: 1,
        speeding: 0,
      },
    }

    return NextResponse.json({
      success: true,
      data: dashboardData,
    })

  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to load dashboard' } },
      { status: 500 }
    )
  }
}











