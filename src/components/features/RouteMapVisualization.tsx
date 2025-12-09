"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Navigation, Route, TrendingUp } from "lucide-react"
import { MARKET_DATA } from "@/lib/market-data"

export function RouteMapVisualization() {
  const routeNames: Record<string, string> = {
    "sea-la": "I-5 Corridor",
    "sea-chi": "I-90 Transcontinental",
    "tac-slc": "I-84 Mountain Route",
    "kent-den": "I-90/I-25 Mountain",
    "sea-sf": "I-5 Pacific Route",
    "pdx-las": "US-95/I-15 Desert",
    "spk-msp": "I-90 Northern",
    "kent-phx": "I-5/I-10 Corridor"
  }

  const majorLanes = MARKET_DATA.hotLanes.map(lane => ({
    route: routeNames[lane.id] || `${lane.from} to ${lane.to}`,
    from: lane.from.split(',')[0], // Just city name
    to: lane.to.split(',')[0],
    distance: `${lane.distance.toLocaleString()} mi`,
    frequency: lane.frequency,
    type: lane.type
  }))

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Route className="h-6 w-6 text-blue-600" />
          Major Freight Corridors
        </h3>
        <p className="text-gray-600">Our primary shipping lanes and routes</p>
      </div>

      <div className="space-y-4">
        {majorLanes.map((lane, index) => (
          <div key={index} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={`text-white ${lane.type === "Primary" ? "!bg-blue-600" : lane.type === "Long-Haul" ? "!bg-purple-600" : "!bg-green-600"}`}>
                    {lane.type}
                  </Badge>
                  <span className="font-semibold text-gray-900">{lane.route}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4 text-green-600" />
                  <span className="font-medium">{lane.from}</span>
                  <Navigation className="h-4 w-4 text-gray-400" />
                  <span className="font-medium">{lane.to}</span>
                  <span className="text-gray-400">•</span>
                  <span>{lane.distance}</span>
                  <span className="text-gray-400">•</span>
                  <span>{lane.frequency}</span>
                </div>
              </div>
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
