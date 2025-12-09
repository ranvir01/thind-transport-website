import { NextRequest, NextResponse } from 'next/server'

/**
 * Loads API
 * 
 * Endpoints for load management.
 * In production, connect to your TMS:
 * - McLeod: Load assignment and tracking
 * - TMW: Dispatch and load management
 * - Custom API: Your dispatch system
 */

// Demo loads data
const DEMO_LOADS = {
  assigned: [
    {
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
      rateType: "flat",
      commodity: "Consumer Electronics",
      weight: 42000,
      pieces: 850,
      customerName: "Amazon Logistics",
      brokerName: "Direct",
    },
  ],
  available: [
    {
      id: "L-78300",
      loadNumber: "TT-78300",
      status: "available",
      pickupLocation: {
        name: "Costco Distribution",
        address: "789 Warehouse Dr",
        city: "Portland",
        state: "OR",
        zipCode: "97201",
      },
      deliveryLocation: {
        name: "Phoenix Regional Hub",
        address: "321 Desert Blvd",
        city: "Phoenix",
        state: "AZ",
        zipCode: "85001",
      },
      pickupDate: "2024-12-05",
      deliveryDate: "2024-12-07",
      miles: 1420,
      rate: 4260,
      rateType: "flat",
      commodity: "General Merchandise",
      weight: 38000,
      customerName: "Costco Wholesale",
    },
    {
      id: "L-78301",
      loadNumber: "TT-78301",
      status: "available",
      pickupLocation: {
        name: "Central Valley Farms",
        address: "555 Agricultural Ln",
        city: "Sacramento",
        state: "CA",
        zipCode: "95814",
      },
      deliveryLocation: {
        name: "Kroger Distribution",
        address: "777 Food Service Rd",
        city: "Denver",
        state: "CO",
        zipCode: "80201",
      },
      pickupDate: "2024-12-06",
      deliveryDate: "2024-12-08",
      miles: 1225,
      rate: 3675,
      rateType: "flat",
      commodity: "Produce (Reefer)",
      weight: 44000,
      temperature: 34,
      customerName: "Kroger Logistics",
    },
    {
      id: "L-78302",
      loadNumber: "TT-78302",
      status: "available",
      pickupLocation: {
        name: "Casino Supplies Inc",
        address: "888 Strip Blvd",
        city: "Las Vegas",
        state: "NV",
        zipCode: "89101",
      },
      deliveryLocation: {
        name: "Entertainment Depot",
        address: "999 Commerce Way",
        city: "Dallas",
        state: "TX",
        zipCode: "75201",
      },
      pickupDate: "2024-12-06",
      deliveryDate: "2024-12-08",
      miles: 1230,
      rate: 3444,
      rateType: "flat",
      commodity: "Gaming Equipment",
      weight: 35000,
      customerName: "MGM Resorts",
    },
  ],
  history: [
    {
      id: "L-78200",
      loadNumber: "TT-78200",
      status: "completed",
      pickupLocation: { city: "Kent", state: "WA" },
      deliveryLocation: { city: "San Diego", state: "CA" },
      pickupDate: "2024-11-25",
      deliveryDate: "2024-11-27",
      deliveredAt: "2024-11-27T14:30:00Z",
      miles: 1255,
      rate: 3765,
      customerName: "Home Depot",
    },
    {
      id: "L-78190",
      loadNumber: "TT-78190",
      status: "completed",
      pickupLocation: { city: "Oakland", state: "CA" },
      deliveryLocation: { city: "Salt Lake City", state: "UT" },
      pickupDate: "2024-11-22",
      deliveryDate: "2024-11-24",
      deliveredAt: "2024-11-24T09:15:00Z",
      miles: 745,
      rate: 2235,
      customerName: "Walmart",
    },
  ],
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'assigned' // assigned, available, history
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')

    // Get the appropriate loads
    const loads = DEMO_LOADS[type as keyof typeof DEMO_LOADS] || []
    
    // Paginate
    const startIndex = (page - 1) * pageSize
    const paginatedLoads = loads.slice(startIndex, startIndex + pageSize)

    return NextResponse.json({
      success: true,
      data: {
        items: paginatedLoads,
        meta: {
          page,
          pageSize,
          totalCount: loads.length,
          totalPages: Math.ceil(loads.length / pageSize),
        },
      },
    })

  } catch (error) {
    console.error('Loads error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to load data' } },
      { status: 500 }
    )
  }
}











