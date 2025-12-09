"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  BarChart3, TrendingUp, MapPin, DollarSign,
  Package, Truck, Shield, PieChart
} from "lucide-react"

interface Load {
  equipmentType: string
  rate: number
  miles: number
}

interface LoadBoardVisualizationsProps {
  loads: Load[]
}

export function LoadBoardVisualizations({ loads }: LoadBoardVisualizationsProps) {
  if (!loads || loads.length === 0) return null

  // Calculate statistics
  const equipmentStats = loads.reduce((acc, load) => {
    if (!acc[load.equipmentType]) {
      acc[load.equipmentType] = { count: 0, totalRate: 0, totalMiles: 0 }
    }
    acc[load.equipmentType].count++
    acc[load.equipmentType].totalRate += load.rate
    acc[load.equipmentType].totalMiles += load.miles
    return acc
  }, {} as Record<string, { count: number; totalRate: number; totalMiles: number }>)

  const avgRatePerMile = loads.reduce((sum, load) => sum + (load.rate / load.miles), 0) / loads.length
  const totalValue = loads.reduce((sum, load) => sum + load.rate, 0)
  const totalMiles = loads.reduce((sum, load) => sum + load.miles, 0)

  const equipmentTypes = Object.entries(equipmentStats).map(([type, stats]) => ({
    type,
    count: stats.count,
    avgRate: stats.totalRate / stats.count,
    avgMiles: stats.totalMiles / stats.count,
    percentage: (stats.count / loads.length) * 100
  }))

  return (
    <div className="grid md:grid-cols-2 gap-6 mb-8">
      {/* Equipment Distribution */}
      <Card className="p-6">
        <div className="mb-4">
          <h3 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
            <PieChart className="h-5 w-5 text-blue-600" />
            Load Distribution by Equipment
          </h3>
          <p className="text-sm text-gray-600">Current available loads breakdown</p>
        </div>
        <div className="space-y-4">
          {equipmentTypes.map((eq) => (
            <div key={eq.type}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {eq.type === "Flatbed" && <Truck className="h-4 w-4 text-green-600" />}
                  {eq.type === "Reefer" && <Shield className="h-4 w-4 text-purple-600" />}
                  {eq.type === "Dry Van" && <Package className="h-4 w-4 text-blue-600" />}
                  <span className="font-semibold text-gray-700">{eq.type}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">{eq.count} loads</span>
                  <Badge variant="secondary">{Math.round(eq.percentage)}%</Badge>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div 
                  className={`h-4 rounded-full ${
                    eq.type === "Flatbed" ? "bg-green-500" :
                    eq.type === "Reefer" ? "bg-purple-500" :
                    "bg-blue-500"
                  }`}
                  style={{ width: `${eq.percentage}%` }}
                />
              </div>
              <div className="mt-1 text-xs text-gray-500">
                Avg: ${eq.avgRate.toLocaleString()} • {Math.round(eq.avgMiles)} miles
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Rate Analysis */}
      <Card className="p-6">
        <div className="mb-4">
          <h3 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-green-600" />
            Rate Analysis
          </h3>
          <p className="text-sm text-gray-600">Current market rates and trends</p>
        </div>
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-xs text-gray-600 mb-1">Average Rate/Mile</div>
              <div className="text-2xl font-black text-blue-600">
                ${avgRatePerMile.toFixed(2)}
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-xs text-gray-600 mb-1">Total Load Value</div>
              <div className="text-2xl font-black text-green-600">
                ${(totalValue / 1000).toFixed(0)}K
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">Rate Range</span>
            </div>
            <div className="space-y-2">
              {equipmentTypes.map((eq) => {
                const minRate = Math.min(...loads.filter(l => l.equipmentType === eq.type).map(l => l.rate / l.miles))
                const maxRate = Math.max(...loads.filter(l => l.equipmentType === eq.type).map(l => l.rate / l.miles))
                return (
                  <div key={eq.type}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-600">{eq.type}</span>
                      <span className="font-semibold">${minRate.toFixed(2)} - ${maxRate.toFixed(2)}/mi</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          eq.type === "Flatbed" ? "bg-green-500" :
                          eq.type === "Reefer" ? "bg-purple-500" :
                          "bg-blue-500"
                        }`}
                        style={{ width: `${((maxRate - minRate) / 3) * 100}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </Card>

      {/* Market Overview */}
      <Card className="p-6 bg-gradient-to-br from-green-50 to-blue-50">
        <div className="mb-4">
          <h3 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Market Overview
          </h3>
          <p className="text-sm text-gray-600">Current load board statistics</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-lg">
            <div className="text-xs text-gray-600 mb-1">Total Miles Available</div>
            <div className="text-2xl font-black text-gray-900">
              {totalMiles.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 mt-1">Across all loads</div>
          </div>
          <div className="bg-white p-4 rounded-lg">
            <div className="text-xs text-gray-600 mb-1">Avg Load Value</div>
            <div className="text-2xl font-black text-green-600">
              ${(totalValue / loads.length).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <div className="text-xs text-gray-500 mt-1">Per load</div>
          </div>
        </div>
      </Card>

      {/* Geographic Distribution */}
      <Card className="p-6">
        <div className="mb-4">
          <h3 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-red-600" />
            Top Origin States
          </h3>
          <p className="text-sm text-gray-600">Where most loads originate</p>
        </div>
        <div className="space-y-3">
          {[
            { state: "Washington", count: 3, percentage: 60 },
            { state: "Oregon", count: 2, percentage: 40 }
          ].map((item) => (
            <div key={item.state}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-gray-700">{item.state}</span>
                <span className="text-sm text-gray-600">{item.count} loads</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-red-500 h-3 rounded-full"
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
