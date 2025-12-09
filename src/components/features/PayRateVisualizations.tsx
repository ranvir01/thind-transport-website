"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  DollarSign, TrendingUp, BarChart3, PieChart, 
  ArrowUp, ArrowDown, Target, Award
} from "lucide-react"
import { PAY_RATES } from "@/lib/constants"

export function PayRateVisualizations() {
  // Calculate data for visualizations (Thind Transport rates)
  const companyDriverData = {
    local: { annual: 57500, weekly: 1106, monthly: 4792 },
    regional: { annual: 63500, weekly: 1221, monthly: 5292 },
    otr: { annual: 71500, weekly: 1375, monthly: 5958 }
  }

  const ownerOperatorData = {
    low: { annual: 180000, weekly: 3462, monthly: 15000 },
    avg: { annual: 230000, weekly: 4423, monthly: 19167 },
    high: { annual: 280000, weekly: 5385, monthly: 23333 }
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Annual Earnings Comparison Chart */}
      <Card className="p-6 border-2 border-black/10 bg-white">
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-6 bg-black rounded-full"></div>
            <h3 className="text-xl font-black text-black">Annual Earnings</h3>
          </div>
          <p className="text-sm text-gray-600">Compare positions at a glance</p>
        </div>
        
        <div className="space-y-3">
          {/* Company Driver Routes */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-semibold text-black">Company Driver - Local</span>
              <span className="font-black text-blue-600">$57.5K</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-5">
              <div 
                className="bg-blue-500 h-5 rounded-full flex items-center justify-end pr-2"
                style={{ width: '20%' }}
              >
                <span className="text-xs text-white font-bold">20%</span>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-semibold text-black">Company Driver - Regional</span>
              <span className="font-black text-blue-600">$63.5K</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-5">
              <div 
                className="bg-blue-600 h-5 rounded-full flex items-center justify-end pr-2"
                style={{ width: '23%' }}
              >
                <span className="text-xs text-white font-bold">23%</span>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-semibold text-black">Company Driver - OTR</span>
              <span className="font-black text-blue-600">$71.5K</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-5">
              <div 
                className="bg-blue-700 h-5 rounded-full flex items-center justify-end pr-2"
                style={{ width: '25%' }}
              >
                <span className="text-xs text-white font-bold">25%</span>
              </div>
            </div>
          </div>

          {/* Owner Operator */}
          <div className="pt-3 border-t-2 border-black/10">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-black text-black">Owner Operator - Average</span>
                <span className="font-black text-green-600 text-lg">$230K</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-6">
                <div 
                  className="bg-gradient-to-r from-green-500 to-green-600 h-6 rounded-full flex items-center justify-end pr-2"
                  style={{ width: '82%' }}
                >
                  <span className="text-xs text-white font-black">82%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Weekly & Monthly Earnings */}
      <Card className="p-6 border-2 border-black/10 bg-white">
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-6 bg-black rounded-full"></div>
            <h3 className="text-xl font-black text-black">Weekly & Monthly</h3>
          </div>
          <p className="text-sm text-gray-600">Average take-home breakdown</p>
        </div>

        <div className="space-y-4">
          {/* Company Driver */}
          <div>
            <h4 className="font-black text-black mb-2 text-sm uppercase tracking-wide">Company Driver</h4>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-3 bg-blue-50 rounded-lg border border-black/5">
                <div className="text-xs text-black/60 mb-1">Local</div>
                <div className="font-black text-black">$1,346</div>
                <div className="text-xs text-black/50">$5,833/mo</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg border border-black/5">
                <div className="text-xs text-black/60 mb-1">Regional</div>
                <div className="font-black text-black">$1,442</div>
                <div className="text-xs text-black/50">$6,250/mo</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg border-2 border-black/10">
                <div className="text-xs text-black/60 mb-1">OTR</div>
                <div className="font-black text-blue-600">$1,635</div>
                <div className="text-xs text-black/50">$7,083/mo</div>
              </div>
            </div>
          </div>

          {/* Owner Operator */}
          <div>
            <h4 className="font-black text-black mb-2 text-sm uppercase tracking-wide">Owner Operator</h4>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-3 bg-green-50 rounded-lg border border-black/5">
                <div className="text-xs text-black/60 mb-1">Low</div>
                <div className="font-black text-black">$2,885</div>
                <div className="text-xs text-black/50">$12.5K/mo</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg border-2 border-black/10">
                <div className="text-xs text-black/60 mb-1 flex items-center justify-center gap-1">
                  Avg <TrendingUp className="h-3 w-3" />
                </div>
                <div className="font-black text-green-600 text-lg">$3,846</div>
                <div className="text-xs text-black/50">$16.7K/mo</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg border border-black/5">
                <div className="text-xs text-black/60 mb-1">High</div>
                <div className="font-black text-black">$4,808</div>
                <div className="text-xs text-black/50">$20.8K/mo</div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 5-Year Earnings Projection */}
      <Card className="p-6 border-2 border-black/10 bg-gradient-to-br from-blue-50 to-green-50">
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-6 bg-black rounded-full"></div>
            <h3 className="text-xl font-black text-black">5-Year Projection</h3>
          </div>
          <p className="text-sm text-gray-600">Total potential earnings</p>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-black">Company Driver (OTR)</span>
              <span className="text-xl font-black text-blue-600">$425K</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-6">
              <div 
                className="bg-blue-600 h-6 rounded-full flex items-center justify-end pr-2"
                style={{ width: '85%' }}
              >
                <span className="text-xs text-white font-black">5 Years</span>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-black text-black">Owner Operator (Average)</span>
              <span className="text-2xl font-black text-green-600">$1M+</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-7">
              <div 
                className="bg-gradient-to-r from-green-500 to-green-600 h-7 rounded-full flex items-center justify-end pr-2"
                style={{ width: '100%' }}
              >
                <span className="text-xs text-white font-black">$1M+ Potential</span>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-green-700 font-semibold">
              <ArrowUp className="h-3 w-3" />
              <span>135% more than company driver</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Commission Breakdown */}
      <Card className="p-6 border-2 border-black/10 bg-white">
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-6 bg-black rounded-full"></div>
            <h3 className="text-xl font-black text-black">Commission Rate</h3>
          </div>
          <p className="text-sm text-gray-600">91% vs industry average</p>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-black/70">Industry Average</span>
              <span className="font-semibold text-black">75-85%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-5">
              <div 
                className="bg-gray-400 h-5 rounded-full"
                style={{ width: '80%' }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-black text-black">Thind Transport</span>
              <span className="font-black text-green-600 text-lg">91%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-6">
              <div 
                className="bg-gradient-to-r from-green-500 to-green-600 h-6 rounded-full flex items-center justify-end pr-2"
                style={{ width: '91%' }}
              >
                <span className="text-xs text-white font-black">91%</span>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-green-700 font-semibold">
              <ArrowUp className="h-3 w-3" />
              <span>6-16% above industry average</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
