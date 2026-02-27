export const MARKET_DATA = {
  lastUpdated: "December 2025 Forecast",
  fuel: {
    nationalAverage: 3.85,
    trend: "stable",
    lastMonth: 3.82
  },
  rates: {
    dryVan: {
      spot: 2.42,
      contract: 2.65,
      min: 2.15,
      max: 2.90
    },
    reefer: {
      spot: 2.78,
      contract: 3.10,
      min: 2.45,
      max: 3.25
    },
    flatbed: {
      spot: 2.95,
      contract: 3.25,
      min: 2.65,
      max: 3.60
    }
  },
  expenses: {
    // Per mile estimates for 2025
    insurance: 0.13,
    maintenance: 0.16,
    permits: 0.02,
    other: 0.05
  },
  // Top lanes data for visualizations and route pages
  hotLanes: [
    { 
      id: "sea-la",
      from: "Seattle, WA", 
      to: "Los Angeles, CA", 
      distance: 1137, 
      rate: 2.95, 
      status: "hot", 
      transitTime: "18-20 hrs",
      frequency: "Daily",
      type: "Primary"
    },
    { 
      id: "kent-den",
      from: "Kent, WA", 
      to: "Denver, CO", 
      distance: 1323, 
      rate: 2.55, 
      status: "hot", 
      transitTime: "20-22 hrs",
      frequency: "3x/week",
      type: "Primary"
    },
    { 
      id: "sea-sf",
      from: "Seattle, WA", 
      to: "San Francisco, CA", 
      distance: 808, 
      rate: 2.35, 
      status: "available", 
      transitTime: "12-14 hrs",
      frequency: "Daily",
      type: "Primary"
    },
    { 
      id: "tac-slc",
      from: "Tacoma, WA", 
      to: "Salt Lake City, UT", 
      distance: 856, 
      rate: 2.25, 
      status: "available", 
      transitTime: "13-15 hrs",
      frequency: "Daily",
      type: "Secondary"
    },
    { 
      id: "pdx-las",
      from: "Portland, OR", 
      to: "Las Vegas, NV", 
      distance: 1018, 
      rate: 2.20, 
      status: "available", 
      transitTime: "15-17 hrs",
      frequency: "Daily",
      type: "Secondary"
    },
    { 
      id: "spk-msp",
      from: "Spokane, WA", 
      to: "Minneapolis, MN", 
      distance: 1655, 
      rate: 2.15, 
      status: "available", 
      transitTime: "24-26 hrs",
      frequency: "Weekly",
      type: "Long-Haul"
    },
    { 
      id: "kent-phx",
      from: "Kent, WA", 
      to: "Phoenix, AZ", 
      distance: 1423, 
      rate: 2.10, 
      status: "available", 
      transitTime: "21-23 hrs",
      frequency: "Daily",
      type: "Secondary"
    },
    { 
      id: "sea-chi",
      from: "Seattle, WA", 
      to: "Chicago, IL", 
      distance: 2064, 
      rate: 2.05, 
      status: "available", 
      transitTime: "30-32 hrs",
      frequency: "3x/week",
      type: "Long-Haul"
    }
  ]
} as const

export type EquipmentType = keyof typeof MARKET_DATA.rates
export type Lane = typeof MARKET_DATA.hotLanes[number]

