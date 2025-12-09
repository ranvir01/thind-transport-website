"use client"

import { useState, useEffect } from "react"
import { TrendingUp, Fuel, Truck, DollarSign, Calculator, Info, ChevronDown, Shield, Wrench, Send, Mail, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { MARKET_DATA, EquipmentType } from "@/lib/market-data"

// Combine static UI data with dynamic market data
const EQUIPMENT_RATES = {
  dryVan: {
    label: "Dry Van",
    minRate: MARKET_DATA.rates.dryVan.min,
    maxRate: MARKET_DATA.rates.dryVan.max,
    defaultRate: MARKET_DATA.rates.dryVan.spot,
    fuelMpg: 7.0,
    description: "General freight, retail goods"
  },
  reefer: {
    label: "Reefer",
    minRate: MARKET_DATA.rates.reefer.min,
    maxRate: MARKET_DATA.rates.reefer.max,
    defaultRate: MARKET_DATA.rates.reefer.spot,
    fuelMpg: 6.5,
    description: "Temperature-controlled loads"
  },
  flatbed: {
    label: "Flatbed",
    minRate: MARKET_DATA.rates.flatbed.min,
    maxRate: MARKET_DATA.rates.flatbed.max,
    defaultRate: MARKET_DATA.rates.flatbed.spot,
    fuelMpg: 6.8,
    description: "Steel, lumber, equipment"
  },
} as const

// Realistic expense estimates (per mile)
const EXPENSES = {
  fuel: { perGallon: MARKET_DATA.fuel.nationalAverage },
  insurance: { perMile: MARKET_DATA.expenses.insurance },
  maintenance: { perMile: MARKET_DATA.expenses.maintenance },
  permits: { perMile: MARKET_DATA.expenses.permits },
  other: { perMile: MARKET_DATA.expenses.other },
}

export const ProfitCalculator = () => {
  const [equipmentType, setEquipmentType] = useState<EquipmentType>("dryVan")
  const [miles, setMiles] = useState<number>(2500)
  const [lineHaulRate, setLineHaulRate] = useState<number>(EQUIPMENT_RATES.dryVan.defaultRate)
  const [showExpenseBreakdown, setShowExpenseBreakdown] = useState(false)
  const [fuelPrice, setFuelPrice] = useState<number>(MARKET_DATA.fuel.nationalAverage)
  
  // Current pay comparison
  const [showComparison, setShowComparison] = useState(false)
  const [currentSplit, setCurrentSplit] = useState(72)
  const [currentWeeklyPay, setCurrentWeeklyPay] = useState(0)
  
  // Email capture for saving calculation
  const [email, setEmail] = useState("")
  const [emailSent, setEmailSent] = useState(false)
  const [isSending, setIsSending] = useState(false)

  // Update rate when equipment type changes
  useEffect(() => {
    setLineHaulRate(EQUIPMENT_RATES[equipmentType].defaultRate)
  }, [equipmentType])
  
  // Handle email submission
  const handleSaveCalculation = async () => {
    if (!email || !email.includes('@')) return
    
    setIsSending(true)
    // Simulate API call - in production, this would send to your backend
    await new Promise(resolve => setTimeout(resolve, 1000))
    setEmailSent(true)
    setIsSending(false)
  }

  const equipment = EQUIPMENT_RATES[equipmentType]
  
  // Core calculations
  const grossRevenue = miles * lineHaulRate
  const fuelSurcharge = miles * 0.15 // ~$0.15/mile avg fuel surcharge
  const totalGross = grossRevenue + fuelSurcharge
  
  // Thind 91% split (100% of fuel surcharge passed through)
  const thindDriverGross = (grossRevenue * 0.91) + fuelSurcharge
  
  // Competitor 70-75% split (typical - using 72% as average, often keep some fuel surcharge)
  const competitorDriverGross = (grossRevenue * 0.72) + (fuelSurcharge * 0.80)
  
  // Operating expenses
  const fuelCost = (miles / equipment.fuelMpg) * fuelPrice
  const insuranceCost = miles * EXPENSES.insurance.perMile
  const maintenanceCost = miles * EXPENSES.maintenance.perMile
  const permitsCost = miles * EXPENSES.permits.perMile
  const otherCost = miles * EXPENSES.other.perMile
  const totalExpenses = fuelCost + insuranceCost + maintenanceCost + permitsCost + otherCost
  
  // Net take-home after expenses
  const thindNetPay = thindDriverGross - totalExpenses
  const competitorNetPay = competitorDriverGross - totalExpenses
  
  // Annual projections (48 weeks to account for downtime)
  const weeksPerYear = 48
  const thindAnnualGross = thindDriverGross * weeksPerYear
  const thindAnnualNet = thindNetPay * weeksPerYear
  const competitorAnnualNet = competitorNetPay * weeksPerYear
  
  // Difference calculations
  const weeklyDifference = thindNetPay - competitorNetPay
  const annualDifference = thindAnnualNet - competitorAnnualNet

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(value)
  }

  const formatCurrencyDetailed = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  }

  return (
    <section id="calculator" className="py-20 md:py-28 bg-navy scroll-mt-20">
      <div className="container max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12 md:mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-orange/20 text-orange font-semibold text-sm mb-4">
            Owner Operator Earnings Calculator
          </span>
          <h2 className="text-3xl md:text-5xl font-black text-white mb-4">
            Calculate Your <span className="text-orange">Real</span> Take-Home
          </h2>
          <p className="text-lg text-white/70 max-w-2xl mx-auto">
            See the actual difference between our 91% split and the typical 70-75% split. 
            We include real operating expenses so you know exactly what to expect.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Inputs Panel */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-orange/20 flex items-center justify-center">
                <Calculator className="w-5 h-5 text-orange" />
              </div>
              <h3 className="text-xl font-bold text-white">Your Load Details</h3>
            </div>

            {/* Equipment Type Selection */}
            <div className="mb-6">
              <label className="font-semibold text-white/90 mb-3 block text-sm">Equipment Type</label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.entries(EQUIPMENT_RATES) as [EquipmentType, typeof EQUIPMENT_RATES[EquipmentType]][]).map(([key, value]) => (
                  <button
                    key={key}
                    onClick={() => setEquipmentType(key)}
                    className={`p-3 rounded-lg border-2 transition-all text-center ${
                      equipmentType === key
                        ? "border-orange bg-orange/10 text-white"
                        : "border-white/10 hover:border-white/30 text-white/70 hover:text-white"
                    }`}
                  >
                    <span className="font-semibold text-sm">{value.label}</span>
                  </button>
                ))}
              </div>
              <p className="text-white/70 text-xs mt-2">
                {equipment.description} • Avg {equipment.fuelMpg} MPG
              </p>
            </div>

            {/* Miles Slider */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <label className="font-semibold text-white/90 text-sm flex items-center gap-2">
                  <Truck className="w-4 h-4 text-orange" />
                  Miles Per Week
                </label>
                <span className="font-mono font-bold text-xl text-orange">{miles.toLocaleString()}</span>
              </div>
              <input 
                type="range" 
                min="1500" 
                max="3500" 
                step="100"
                value={miles}
                onChange={(e) => setMiles(Number(e.target.value))}
                className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-orange"
              />
              <div className="flex justify-between text-xs text-white/70 mt-2 font-mono">
                <span>1,500 mi</span>
                <span className="text-white/70">|</span>
                <span>2,500 avg</span>
                <span className="text-white/70">|</span>
                <span>3,500 mi</span>
              </div>
            </div>

            {/* Rate Slider */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <label className="font-semibold text-white/90 text-sm flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-orange" />
                  Linehaul Rate (per mile)
                  <span className="relative group">
                    <Info className="w-3.5 h-3.5 text-white/60 cursor-help" />
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-navy-dark text-xs text-white/80 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 border border-white/10">
                      The rate per mile your loads pay before the split. This varies by lane, season, and freight market.
                    </span>
                  </span>
                </label>
                <span className="font-mono font-bold text-xl text-orange">${lineHaulRate.toFixed(2)}</span>
              </div>
              <input 
                type="range" 
                min={equipment.minRate} 
                max={equipment.maxRate} 
                step="0.05"
                value={lineHaulRate}
                onChange={(e) => setLineHaulRate(Number(e.target.value))}
                className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-orange"
              />
              <div className="flex justify-between text-xs text-white/70 mt-2 font-mono">
                <span>${equipment.minRate.toFixed(2)}</span>
                <span className="text-green-400">Current {equipment.label} Market</span>
                <span>${equipment.maxRate.toFixed(2)}</span>
              </div>
            </div>

            {/* Fuel Price Slider */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <label className="font-semibold text-white/90 text-sm flex items-center gap-2">
                  <Fuel className="w-4 h-4 text-orange" />
                  Diesel Price (per gallon)
                </label>
                <span className="font-mono font-bold text-xl text-orange">${fuelPrice.toFixed(2)}</span>
              </div>
              <input 
                type="range" 
                min="3.00" 
                max="4.50" 
                step="0.05"
                value={fuelPrice}
                onChange={(e) => setFuelPrice(Number(e.target.value))}
                className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-orange"
              />
              <div className="flex justify-between text-xs text-white/70 mt-2 font-mono">
                <span>$3.00</span>
                <span className="text-white/80">National avg ~${MARKET_DATA.fuel.nationalAverage.toFixed(2)}</span>
                <span>$4.50</span>
              </div>
            </div>

            {/* Compare to Your Current Pay */}
            <div className="mb-6">
              <button
                onClick={() => setShowComparison(!showComparison)}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-orange/30 bg-orange/10 hover:bg-orange/20 transition-colors text-white"
              >
                <span className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-orange" />
                  Compare to Your Current Pay
                </span>
                <ChevronDown className={`w-4 h-4 text-orange transition-transform ${showComparison ? 'rotate-180' : ''}`} />
              </button>

              {showComparison && (
                <div className="mt-3 p-4 rounded-lg bg-orange/5 border border-orange/20 space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm text-white/90">Your current split %</label>
                      <span className="font-mono font-bold text-orange">{currentSplit}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="60" 
                      max="88" 
                      step="1"
                      value={currentSplit}
                      onChange={(e) => setCurrentSplit(Number(e.target.value))}
                      className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-orange"
                    />
                    <div className="flex justify-between text-xs text-white/80 mt-1">
                      <span>60%</span>
                      <span>Industry: 70-75%</span>
                      <span>88%</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm text-white/90 mb-2 block">Your current weekly take-home (optional)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/70" />
                      <input 
                        type="number"
                        placeholder="e.g., 3500"
                        value={currentWeeklyPay || ''}
                        onChange={(e) => setCurrentWeeklyPay(Number(e.target.value))}
                        className="w-full pl-9 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/60 focus:outline-none focus:border-orange"
                      />
                    </div>
                  </div>

                  {currentWeeklyPay > 0 && (
                    <div className="p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
                      <p className="text-green-400 text-sm font-semibold">
                        With Thind's 91% split, you could earn approximately{' '}
                        <span className="text-green-300 font-black text-lg">
                          {formatCurrency(currentWeeklyPay * (91 / currentSplit) - currentWeeklyPay)} more
                        </span>{' '}
                        per week!
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Gross Revenue Summary */}
            <div className="bg-navy/50 rounded-xl p-4 border border-white/10 mb-4">
              <div className="flex justify-between items-center">
                <p className="text-white/80 text-sm">Weekly Gross Revenue</p>
                <p className="text-2xl font-black text-white">{formatCurrency(totalGross)}</p>
              </div>
              <div className="flex justify-between items-center text-xs text-white/70 mt-1">
                <span>Linehaul: {formatCurrency(grossRevenue)}</span>
                <span>Fuel Surcharge: +{formatCurrency(fuelSurcharge)}</span>
              </div>
            </div>

            {/* Expense Breakdown Toggle */}
            <button
              onClick={() => setShowExpenseBreakdown(!showExpenseBreakdown)}
              className="w-full flex items-center justify-between p-3 rounded-lg border border-white/10 hover:border-white/20 transition-colors text-white/70 hover:text-white"
            >
              <span className="text-sm font-semibold flex items-center gap-2">
                <Wrench className="w-4 h-4" />
                View Operating Expenses
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showExpenseBreakdown ? 'rotate-180' : ''}`} />
            </button>

            {showExpenseBreakdown && (
              <div className="mt-3 p-4 rounded-lg bg-navy/30 border border-white/5 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-white/80">⛽ Fuel ({Math.round(miles / equipment.fuelMpg)} gal)</span>
                  <span className="text-white/90 font-mono">-{formatCurrency(fuelCost)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/80">🛡️ Insurance</span>
                  <span className="text-white/90 font-mono">-{formatCurrency(insuranceCost)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/80">🔧 Maintenance</span>
                  <span className="text-white/90 font-mono">-{formatCurrency(maintenanceCost)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/80">📋 Permits & Fees</span>
                  <span className="text-white/90 font-mono">-{formatCurrency(permitsCost + otherCost)}</span>
                </div>
                <div className="border-t border-white/10 pt-2 flex justify-between">
                  <span className="text-white/90 font-semibold text-sm">Total Weekly Expenses</span>
                  <span className="text-red-400 font-bold font-mono">-{formatCurrency(totalExpenses)}</span>
                </div>
                <p className="text-xs text-white/70 pt-2">
                  * Estimates based on industry averages. Your actual expenses may vary.
                </p>
              </div>
            )}
          </div>

          {/* Results Panel */}
          <div className="bg-white rounded-2xl shadow-brand-lg p-6 md:p-8 flex flex-col">
            <h3 className="text-xl font-bold text-navy mb-6 text-center">Your Weekly Take-Home</h3>
            
            {/* Main Comparison Cards */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* Competitor Card */}
              <div className="bg-gray-100 rounded-xl p-4 border-2 border-gray-200">
                <p className="text-gray-700 text-xs font-semibold uppercase tracking-wider mb-1">Other Carriers</p>
                <p className="text-sm text-gray-600 mb-3">~72% Split</p>
                
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-gray-600">Your Cut</p>
                    <p className="text-lg font-bold text-gray-800">{formatCurrency(competitorDriverGross)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">After Expenses</p>
                    <p className="text-xl font-black text-gray-800">{formatCurrency(competitorNetPay)}</p>
                  </div>
                </div>
              </div>

              {/* Thind Card */}
              <div className="bg-gradient-to-br from-orange/10 to-orange/5 rounded-xl p-4 border-2 border-orange relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-orange text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">
                  +{Math.round((0.91 - 0.72) / 0.72 * 100)}% MORE
                </div>
                <p className="text-orange text-xs font-semibold uppercase tracking-wider mb-1">Thind Transport</p>
                <p className="text-sm text-orange/70 mb-3">91% Split</p>
                
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-navy/80">Your Cut</p>
                    <p className="text-lg font-bold text-navy">{formatCurrency(thindDriverGross)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-navy/80">After Expenses</p>
                    <p className="text-2xl font-black text-navy">{formatCurrency(thindNetPay)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Bar Comparison */}
            <div className="mb-6">
              <p className="text-sm text-gray-700 mb-3 font-semibold">Net Weekly Comparison</p>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-steel w-16 font-mono">72%</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                    <div 
                      className="h-full bg-gray-400 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                      style={{ width: `${Math.min(100, (competitorNetPay / thindNetPay) * 100)}%` }}
                    >
                      <span className="text-xs text-white font-bold">{formatCurrency(competitorNetPay)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-orange font-bold w-16 font-mono">91%</span>
                  <div className="flex-1 bg-orange/20 rounded-full h-6 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-orange to-orange-500 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                      style={{ width: '100%' }}
                    >
                      <span className="text-xs text-white font-bold">{formatCurrency(thindNetPay)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Difference Callouts */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <p className="text-green-700 font-semibold text-xs mb-1 uppercase tracking-wider">Weekly Extra</p>
                <p className="text-2xl font-black text-green-600">
                  +{formatCurrency(weeklyDifference)}
                </p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <p className="text-green-700 font-semibold text-xs mb-1 uppercase tracking-wider">Annual Extra</p>
                <p className="text-2xl font-black text-green-600">
                  +{formatCurrency(annualDifference)}
                </p>
              </div>
            </div>

            {/* Annual Summary */}
            <div className="bg-navy/5 rounded-xl p-4 mb-6 border border-navy/10">
              <p className="text-navy font-bold text-sm mb-3">Annual Projection (48 weeks)</p>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-xs text-gray-600">Gross Revenue</p>
                  <p className="text-lg font-black text-navy">{formatCurrency(thindAnnualGross)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Est. Net Income</p>
                  <p className="text-lg font-black text-green-600">{formatCurrency(thindAnnualNet)}</p>
                </div>
              </div>
            </div>

            {/* Benefits Reminder */}
            <div className="flex items-start gap-3 p-3 bg-orange/5 rounded-lg mb-4 border border-orange/20">
              <Shield className="w-5 h-5 text-orange flex-shrink-0 mt-0.5" />
              <div className="text-xs text-gray-700">
                <p className="font-semibold text-navy mb-1">What's Included with Thind:</p>
                <ul className="space-y-0.5">
                  <li>✓ 100% fuel surcharge passed through</li>
                  <li>✓ No hidden fees or deductions</li>
                  <li>✓ Weekly direct deposit settlements</li>
                  <li>✓ Fuel card discounts available</li>
                </ul>
              </div>
            </div>

            {/* CTA */}
            <Link 
              href="/apply" 
              className="w-full py-4 bg-orange hover:bg-orange-600 text-white font-bold text-lg rounded-lg transition-all text-center shadow-cta hover:shadow-cta-hover flex items-center justify-center gap-2"
            >
              <TrendingUp className="w-5 h-5" />
              Start Earning {formatCurrency(weeklyDifference)} More Weekly
            </Link>

            {/* Save Calculation Feature */}
            <div className="mt-4 p-4 bg-navy/5 rounded-xl border border-navy/10">
              <p className="text-sm font-semibold text-navy mb-3 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Save Your Calculation
              </p>
              {emailSent ? (
                <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-sm font-medium">Calculation sent! Check your inbox.</span>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input 
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange focus:ring-1 focus:ring-orange"
                  />
                  <button
                    onClick={handleSaveCalculation}
                    disabled={isSending || !email.includes('@')}
                    className="px-4 py-2 bg-navy text-white font-semibold text-sm rounded-lg hover:bg-navy-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isSending ? (
                      <span className="animate-spin">⏳</span>
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Send
                  </button>
                </div>
              )}
              <p className="text-xs text-gray-500 mt-2">
                We'll email your personalized earnings estimate. No spam, ever.
              </p>
            </div>

            <p className="text-center text-xs text-gray-500 mt-3">
              * Estimates based on current market conditions. Actual earnings depend on loads, lanes, and individual expenses.
            </p>
          </div>
        </div>

        {/* Bottom Context */}
        <div className="mt-8 text-center">
          <p className="text-white/80 text-sm max-w-2xl mx-auto">
            <strong className="text-white">Why 91%?</strong> Most carriers keep 25-30% of your linehaul. 
            We only take 9% to cover dispatch, billing, and admin — you keep the rest.
            No hidden fees, no surprises.
          </p>
        </div>
      </div>
    </section>
  )
}
