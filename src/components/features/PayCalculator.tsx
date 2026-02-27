"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { 
  DollarSign, TrendingUp, Calendar, MapPin, 
  Fuel, Calculator, AlertCircle, CheckCircle2
} from "lucide-react"
import { PAY_RATES } from "@/lib/constants"

export function PayCalculator() {
  const [driverType, setDriverType] = useState<"company" | "owner">("company")
  const [milesPerWeek, setMilesPerWeek] = useState("2500")
  const [weeksPerYear, setWeeksPerYear] = useState("50")
  const [routeType, setRouteType] = useState<"local" | "regional" | "otr">("otr")

  // Calculate earnings based on Dec 2025 industry rates
  const calculateEarnings = () => {
    const miles = parseFloat(milesPerWeek) || 0
    const weeks = parseFloat(weeksPerYear) || 0
    const totalMiles = miles * weeks

    if (driverType === "owner") {
      const avgRatePerMile = 2.75 // Average of $2.25-$3.25 (Dec 2025 industry avg)
      const grossRevenue = totalMiles * avgRatePerMile
      const commission = grossRevenue * 0.91
      const weekly = commission / weeks
      const monthly = weekly * 4.33
      const annual = commission

      return {
        weekly: weekly,
        monthly: monthly,
        annual: annual,
        perMile: avgRatePerMile,
        totalMiles: totalMiles,
        commission: commission,
        grossRevenue: grossRevenue
      }
    } else {
      // Company driver rates vary by route type (Thind Transport rates)
      const ratePerMile = routeType === "local" ? 0.52 : routeType === "regional" ? 0.55 : 0.58
      const grossPay = totalMiles * ratePerMile
      const weekly = grossPay / weeks
      const monthly = weekly * 4.33
      const annual = grossPay

      return {
        weekly: weekly,
        monthly: monthly,
        annual: annual,
        perMile: ratePerMile,
        totalMiles: totalMiles,
        commission: 0,
        grossRevenue: grossPay
      }
    }
  }

  const results = calculateEarnings()

  return (
    <Card className="p-8 bg-gradient-to-br from-blue-50 to-green-50 border-2 border-black/10">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-black p-3 rounded-lg border-2 border-black/20">
          <Calculator className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-black">Pay Calculator</h2>
          <p className="text-sm text-gray-700 font-medium">Calculate your potential earnings</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Input Section */}
        <div className="space-y-6">
          <div>
            <Label htmlFor="driver-type" className="text-base font-black text-black mb-2 block">
              Driver Type
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setDriverType("company")}
                className={`p-4 rounded-lg border-2 transition-all ${
                  driverType === "company"
                    ? "border-black bg-blue-50 shadow-md"
                    : "border-black/10 hover:border-black/20 bg-white"
                }`}
              >
                <div className="font-black text-black">Company Driver</div>
                <div className="text-xs text-gray-700 mt-1 font-medium">$0.60-$0.65/mile</div>
              </button>
              <button
                onClick={() => setDriverType("owner")}
                className={`p-4 rounded-lg border-2 transition-all ${
                  driverType === "owner"
                    ? "border-black bg-green-50 shadow-md"
                    : "border-black/10 hover:border-black/20 bg-white"
                }`}
              >
                <div className="font-black text-black">Owner Operator</div>
                <div className="text-xs text-gray-700 mt-1 font-medium">91% commission</div>
              </button>
            </div>
          </div>

          {driverType === "company" && (
            <div>
            <Label htmlFor="route-type" className="text-base font-black text-black mb-2 block">
              Route Type
            </Label>
              <Select value={routeType} onValueChange={(value: "local" | "regional" | "otr") => setRouteType(value)}>
                <SelectTrigger id="route-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="local">Local - Home Daily</SelectItem>
                  <SelectItem value="regional">Regional - Home Weekly</SelectItem>
                  <SelectItem value="otr">OTR - Home 2-3 Weeks</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label htmlFor="miles" className="text-base font-black text-black mb-2 block">
              Average Miles Per Week
            </Label>
            <Input
              id="miles"
              type="number"
              value={milesPerWeek}
              onChange={(e) => setMilesPerWeek(e.target.value)}
              placeholder="2500"
              className="text-lg border-black/20"
            />
            <p className="text-xs text-gray-700 mt-1 font-medium">
              Typical: 2,000-3,000 miles/week
            </p>
          </div>

          <div>
            <Label htmlFor="weeks" className="text-base font-black text-black mb-2 block">
              Weeks Worked Per Year
            </Label>
            <Input
              id="weeks"
              type="number"
              value={weeksPerYear}
              onChange={(e) => setWeeksPerYear(e.target.value)}
              placeholder="50"
              className="text-lg border-black/20"
            />
            <p className="text-xs text-gray-700 mt-1 font-medium">
              Typical: 48-50 weeks/year
            </p>
          </div>

          {driverType === "owner" && (
            <div className="p-4 bg-yellow-50 border-2 border-black/10 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div className="text-sm text-gray-800 font-medium">
                  <strong className="text-black">Note:</strong> Owner operators keep 91% of gross revenue. 
                  Expenses (fuel, maintenance, insurance) are your responsibility.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results Section */}
        <div className="space-y-4">
          <div className="text-center mb-6">
            <Badge className="mb-2 bg-black text-white">
              <TrendingUp className="h-3 w-3 mr-1" />
              Your Earnings Estimate
            </Badge>
            <div className="text-4xl font-black text-black mb-1">
              ${results.annual.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <div className="text-sm text-gray-700 font-medium">per year</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4 bg-white border-2 border-black/5">
              <div className="flex items-center gap-2 text-gray-700 mb-1">
                <Calendar className="h-4 w-4" />
                <span className="text-xs font-medium">Weekly</span>
              </div>
              <div className="text-2xl font-black text-black">
                ${results.weekly.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </Card>

            <Card className="p-4 bg-white border-2 border-black/5">
              <div className="flex items-center gap-2 text-gray-700 mb-1">
                <Calendar className="h-4 w-4" />
                <span className="text-xs font-medium">Monthly</span>
              </div>
              <div className="text-2xl font-black text-black">
                ${results.monthly.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </Card>
          </div>

          <Card className="p-4 bg-white border-2 border-black/5">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-700 font-medium">Total Miles:</span>
                <span className="font-black text-black">{results.totalMiles.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700 font-medium">Rate per Mile:</span>
                <span className="font-black text-black">${results.perMile.toFixed(2)}</span>
              </div>
              {driverType === "owner" && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-700 font-medium">Gross Revenue:</span>
                    <span className="font-black text-black">${results.grossRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="flex justify-between border-t-2 border-black/10 pt-2">
                    <span className="text-gray-700 font-medium">Your Commission (91%):</span>
                    <span className="font-black text-green-600">${results.commission.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </div>
                </>
              )}
            </div>
          </Card>

          <div className="p-4 bg-blue-50 rounded-lg border-2 border-black/10">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-xs text-gray-800 font-medium">
                <strong className="text-black">Remember:</strong> These are estimates. Actual earnings depend on 
                load availability, fuel costs, and your driving schedule.
              </div>
            </div>
          </div>

          <Button className="w-full bg-green-600 hover:bg-green-700" size="lg" asChild>
            <a href="/apply">
              Apply Now to Start Earning
            </a>
          </Button>
        </div>
      </div>
    </Card>
  )
}
