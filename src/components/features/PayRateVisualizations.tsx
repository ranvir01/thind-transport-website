"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  TrendingUp, ArrowUp,
} from "lucide-react"
import { PAY_RATES } from "@/lib/constants"
import { parseAnnualRange } from "@/lib/job-posting"
import { fiveYearProjection } from "@/lib/pay-projections"

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`

/** Midpoint of a published annual range, plus its weekly and monthly split.
 *  Derived, not typed: the hardcoded figures that used to sit here described a
 *  $70K local and an $85K OTR year, neither of which is a range this site
 *  publishes. */
function fromRange(range: string) {
  const [min, max] = parseAnnualRange(range)
  const annual = (min + max) / 2
  return { annual, weekly: annual / 52, monthly: annual / 12 }
}

export function PayRateVisualizations() {
  const projection = fiveYearProjection()
  const local = fromRange(PAY_RATES.companyDriver.local.annual)
  const regional = fromRange(PAY_RATES.companyDriver.regional.annual)
  const otr = fromRange(PAY_RATES.companyDriver.otr.annual)
  const owner = fromRange(PAY_RATES.ownerOperator.annualGross)
  const [ownerLow, ownerHigh] = parseAnnualRange(PAY_RATES.ownerOperator.annualGross)

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Annual Earnings Comparison Chart */}
      <Card className="p-6 border-2 border-gray-200 bg-white">
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-6 bg-orange-600 rounded-full"></div>
            <h3 className="text-xl font-black text-gray-900">Annual Earnings</h3>
          </div>
          <p className="text-sm text-gray-600">Compare positions at a glance</p>
        </div>
        
        <div className="space-y-3">
          {/* Company Driver Routes */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-semibold text-gray-900">Company Driver - Local</span>
              <span className="font-black text-navy">$57.5K</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-5">
              <div 
                className="bg-slate-500 h-5 rounded-full flex items-center justify-end pr-2"
                style={{ width: '20%' }}
              >
                <span className="text-xs text-white font-bold">20%</span>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-semibold text-gray-900">Company Driver - Regional</span>
              <span className="font-black text-navy">$63.5K</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-5">
              <div 
                className="bg-navy h-5 rounded-full flex items-center justify-end pr-2"
                style={{ width: '23%' }}
              >
                <span className="text-xs text-white font-bold">23%</span>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-semibold text-gray-900">Company Driver - OTR</span>
              <span className="font-black text-navy">$71.5K</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-5">
              <div 
                className="bg-navy-900 h-5 rounded-full flex items-center justify-end pr-2"
                style={{ width: '25%' }}
              >
                <span className="text-xs text-white font-bold">25%</span>
              </div>
            </div>
          </div>

          {/* Owner Operator */}
          <div className="pt-3 border-t-2 border-gray-200">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-black text-gray-900">Owner Operator - Average</span>
                <span className="font-black text-green-600 text-lg">{usd(owner.annual / 1000)}K</span>
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
      <Card className="p-6 border-2 border-gray-200 bg-white">
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-6 bg-orange-600 rounded-full"></div>
            <h3 className="text-xl font-black text-gray-900">Weekly & Monthly</h3>
          </div>
          <p className="text-sm text-gray-600">Midpoint of each published range, before deductions</p>
        </div>

        <div className="space-y-4">
          {/* Company Driver */}
          <div>
            <h4 className="font-black text-gray-900 mb-2 text-sm uppercase tracking-wide">Company Driver</h4>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-3 bg-slate-50 rounded-lg border border-gray-200">
                <div className="text-xs text-gray-500 mb-1">Local</div>
                <div className="font-black text-gray-900">{usd(local.weekly)}</div>
                <div className="text-xs text-gray-500">{usd(local.monthly)}/mo</div>
              </div>
              <div className="text-center p-3 bg-slate-50 rounded-lg border border-gray-200">
                <div className="text-xs text-gray-500 mb-1">Regional</div>
                <div className="font-black text-gray-900">{usd(regional.weekly)}</div>
                <div className="text-xs text-gray-500">{usd(regional.monthly)}/mo</div>
              </div>
              <div className="text-center p-3 bg-slate-50 rounded-lg border-2 border-gray-200">
                <div className="text-xs text-gray-500 mb-1">OTR</div>
                <div className="font-black text-navy">{usd(otr.weekly)}</div>
                <div className="text-xs text-gray-500">{usd(otr.monthly)}/mo</div>
              </div>
            </div>
          </div>

          {/* Owner Operator */}
          <div>
            <h4 className="font-black text-gray-900 mb-2 text-sm uppercase tracking-wide">Owner Operator</h4>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-3 bg-green-50 rounded-lg border border-gray-200">
                <div className="text-xs text-gray-500 mb-1">Low</div>
                <div className="font-black text-gray-900">{usd(ownerLow / 52)}</div>
                <div className="text-xs text-gray-500">{usd(ownerLow / 12)}/mo</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg border-2 border-gray-200">
                <div className="text-xs text-gray-500 mb-1 flex items-center justify-center gap-1">
                  Avg <TrendingUp className="h-3 w-3" />
                </div>
                <div className="font-black text-green-600 text-lg">{usd(owner.weekly)}</div>
                <div className="text-xs text-gray-500">{usd(owner.monthly)}/mo</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg border border-gray-200">
                <div className="text-xs text-gray-500 mb-1">High</div>
                <div className="font-black text-gray-900">{usd(ownerHigh / 52)}</div>
                <div className="text-xs text-gray-500">{usd(ownerHigh / 12)}/mo</div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 5-Year Earnings Projection — every figure derived from PAY_RATES
          (lib/pay-projections.ts), so a rate change moves this card with it
          instead of stranding a stale headline number. */}
      <Card className="p-6 border-2 border-gray-200 bg-gradient-to-br from-slate-50 to-green-50">
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-6 bg-orange-600 rounded-full"></div>
            <h3 className="text-xl font-black text-gray-900">5-Year Projection</h3>
          </div>
          <p className="text-sm text-gray-600">Published annual ranges × 5, at today&apos;s rates</p>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-900">Company Driver (OTR)</span>
              <span className="text-xl font-black text-navy">{projection.companyOtr.label}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-6">
              <div
                className="bg-navy h-6 rounded-full flex items-center justify-end pr-2"
                style={{ width: `${projection.companyBarPct}%` }}
              >
                <span className="text-xs text-white font-black">5 Years</span>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-black text-gray-900">Owner Operator (90% gross)</span>
              <span className="text-2xl font-black text-green-600">{projection.ownerOperator.label}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-7">
              <div
                className="bg-gradient-to-r from-green-500 to-green-600 h-7 rounded-full flex items-center justify-end pr-2"
                style={{ width: '100%' }}
              >
                <span className="text-xs text-white font-black">5 Years</span>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-green-700 font-semibold">
              <ArrowUp className="h-3 w-3" />
              <span>{projection.ooAdvantagePct}% more than company driver (range midpoints, before expenses)</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Commission Breakdown */}
      <Card className="p-6 border-2 border-gray-200 bg-white">
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-6 bg-orange-600 rounded-full"></div>
            <h3 className="text-xl font-black text-gray-900">Commission Rate</h3>
          </div>
          <p className="text-sm text-gray-600">90% vs industry average</p>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Industry Average</span>
              <span className="font-semibold text-gray-900">75-85%</span>
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
              <span className="text-sm font-black text-gray-900">Thind Transport</span>
              <span className="font-black text-green-600 text-lg">90%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-6">
              <div 
                className="bg-gradient-to-r from-green-500 to-green-600 h-6 rounded-full flex items-center justify-end pr-2"
                style={{ width: '90%' }}
              >
                <span className="text-xs text-white font-black">90%</span>
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
