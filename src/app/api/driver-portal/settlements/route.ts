import { NextRequest, NextResponse } from 'next/server'

/**
 * Settlements API
 * 
 * Endpoints for settlement/pay management.
 * In production, connect to your accounting/TMS system:
 * - McLeod: Settlement processing
 * - TMW: Pay statements
 * - QuickBooks/accounting integration
 */

// Demo settlements data
const DEMO_SETTLEMENTS = [
  {
    id: "S-1234",
    settlementNumber: "2024-W47",
    driverId: "D001",
    periodStart: "2024-11-18",
    periodEnd: "2024-11-24",
    status: "paid",
    grossPay: 4250,
    lineHaulPay: 3850,
    accessorialPay: 250,
    bonuses: 150,
    reimbursements: 0,
    deductions: [
      { type: "insurance", description: "Occupational Accident Insurance", amount: 85 },
      { type: "escrow", description: "Escrow Contribution", amount: 100 },
      { type: "eld_fee", description: "ELD Service Fee", amount: 40 },
      { type: "fuel_advance", description: "Fuel Advance Repayment", amount: 200 },
    ],
    totalDeductions: 425,
    netPay: 3825,
    paymentDate: "2024-11-27",
    paymentMethod: "direct_deposit",
    loads: [
      { loadId: "L-78100", loadNumber: "TT-78100", pickupCity: "Seattle", deliveryCity: "Phoenix", miles: 1420, pay: 2130, deliveredDate: "2024-11-19" },
      { loadId: "L-78110", loadNumber: "TT-78110", pickupCity: "Phoenix", deliveryCity: "El Paso", miles: 430, pay: 645, deliveredDate: "2024-11-20" },
      { loadId: "L-78120", loadNumber: "TT-78120", pickupCity: "El Paso", deliveryCity: "Dallas", miles: 620, pay: 930, deliveredDate: "2024-11-22" },
      { loadId: "L-78130", loadNumber: "TT-78130", pickupCity: "Dallas", deliveryCity: "Kent", miles: 370, pay: 545, deliveredDate: "2024-11-24" },
    ],
    totalMiles: 2840,
    totalLoads: 4,
    createdAt: "2024-11-25T08:00:00Z",
  },
  {
    id: "S-1233",
    settlementNumber: "2024-W46",
    driverId: "D001",
    periodStart: "2024-11-11",
    periodEnd: "2024-11-17",
    status: "paid",
    grossPay: 3890,
    lineHaulPay: 3640,
    accessorialPay: 150,
    bonuses: 100,
    reimbursements: 0,
    deductions: [
      { type: "insurance", description: "Occupational Accident Insurance", amount: 85 },
      { type: "escrow", description: "Escrow Contribution", amount: 100 },
      { type: "eld_fee", description: "ELD Service Fee", amount: 40 },
      { type: "cargo_insurance", description: "Cargo Insurance", amount: 164 },
    ],
    totalDeductions: 389,
    netPay: 3501,
    paymentDate: "2024-11-20",
    paymentMethod: "direct_deposit",
    loads: [
      { loadId: "L-78050", loadNumber: "TT-78050", pickupCity: "Kent", deliveryCity: "Los Angeles", miles: 1135, pay: 1702, deliveredDate: "2024-11-13" },
      { loadId: "L-78060", loadNumber: "TT-78060", pickupCity: "Los Angeles", deliveryCity: "San Francisco", miles: 382, pay: 573, deliveredDate: "2024-11-15" },
      { loadId: "L-78070", loadNumber: "TT-78070", pickupCity: "San Francisco", deliveryCity: "Portland", miles: 635, pay: 952, deliveredDate: "2024-11-17" },
    ],
    totalMiles: 2152,
    totalLoads: 3,
    createdAt: "2024-11-18T08:00:00Z",
  },
  {
    id: "S-1232",
    settlementNumber: "2024-W45",
    driverId: "D001",
    periodStart: "2024-11-04",
    periodEnd: "2024-11-10",
    status: "paid",
    grossPay: 4100,
    lineHaulPay: 3850,
    accessorialPay: 100,
    bonuses: 150,
    reimbursements: 0,
    deductions: [
      { type: "insurance", description: "Occupational Accident Insurance", amount: 85 },
      { type: "escrow", description: "Escrow Contribution", amount: 100 },
      { type: "eld_fee", description: "ELD Service Fee", amount: 40 },
      { type: "lumper", description: "Lumper Service", amount: 185 },
    ],
    totalDeductions: 410,
    netPay: 3690,
    paymentDate: "2024-11-13",
    paymentMethod: "direct_deposit",
    loads: [
      { loadId: "L-78000", loadNumber: "TT-78000", pickupCity: "Kent", deliveryCity: "Denver", miles: 1320, pay: 1980, deliveredDate: "2024-11-06" },
      { loadId: "L-78010", loadNumber: "TT-78010", pickupCity: "Denver", deliveryCity: "Chicago", miles: 1004, pay: 1506, deliveredDate: "2024-11-09" },
    ],
    totalMiles: 2324,
    totalLoads: 2,
    createdAt: "2024-11-11T08:00:00Z",
  },
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')
    const status = searchParams.get('status')

    // Filter by status if provided
    let settlements = DEMO_SETTLEMENTS
    if (status) {
      settlements = settlements.filter(s => s.status === status)
    }

    // Paginate
    const startIndex = (page - 1) * pageSize
    const paginatedSettlements = settlements.slice(startIndex, startIndex + pageSize)

    return NextResponse.json({
      success: true,
      data: {
        items: paginatedSettlements,
        meta: {
          page,
          pageSize,
          totalCount: settlements.length,
          totalPages: Math.ceil(settlements.length / pageSize),
        },
      },
    })

  } catch (error) {
    console.error('Settlements error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to load settlements' } },
      { status: 500 }
    )
  }
}











