"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { CheckCircle2, XCircle, ChevronDown, TrendingUp, DollarSign, Home, Shield, Truck, Users, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

interface ComparisonItem {
  feature: string
  thind: string | boolean
  competitor: string | boolean
  highlight?: boolean
  icon?: React.ReactNode
}

const comparisons: ComparisonItem[] = [
  { 
    feature: "Commission Rate", 
    thind: "91%", 
    competitor: "70-75%", 
    highlight: true,
    icon: <DollarSign className="h-4 w-4" />
  },
  { 
    feature: "Fuel Surcharge", 
    thind: "100% to driver", 
    competitor: "Split or withheld",
    icon: <TrendingUp className="h-4 w-4" />
  },
  { 
    feature: "Sign-On Bonus (O/O)", 
    thind: "$2,500", 
    competitor: "$500-$1,500", 
    highlight: true,
    icon: <DollarSign className="h-4 w-4" />
  },
  { 
    feature: "Forced Dispatch", 
    thind: false, 
    competitor: true,
    icon: <Truck className="h-4 w-4" />
  },
  { 
    feature: "Hidden Fees", 
    thind: false, 
    competitor: true,
    icon: <Shield className="h-4 w-4" />
  },
  { 
    feature: "Settlement Day", 
    thind: "Every Friday", 
    competitor: "Varies (often delayed)",
    icon: <Clock className="h-4 w-4" />
  },
  { 
    feature: "Equipment Age", 
    thind: "2023-2025 models", 
    competitor: "3-7+ years old",
    icon: <Truck className="h-4 w-4" />
  },
  { 
    feature: "24/7 Live Support", 
    thind: true, 
    competitor: false,
    icon: <Users className="h-4 w-4" />
  },
  { 
    feature: "Home Time Honored", 
    thind: true, 
    competitor: false,
    icon: <Home className="h-4 w-4" />
  },
]

interface CompetitorComparisonProps {
  variant?: "full" | "compact" | "card"
  showCTA?: boolean
  className?: string
  title?: string
}

export function CompetitorComparison({ 
  variant = "full", 
  showCTA = true,
  className = "",
  title = "See Why Drivers Switch to Us"
}: CompetitorComparisonProps) {
  const [expanded, setExpanded] = useState(false)
  
  const displayItems = variant === "compact" && !expanded 
    ? comparisons.slice(0, 5) 
    : comparisons

  const renderValue = (value: string | boolean, isThind: boolean) => {
    if (typeof value === "boolean") {
      return value ? (
        <div className="flex items-center gap-1">
          {isThind ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : (
            <XCircle className="h-5 w-5 text-red-500" />
          )}
          <span className={isThind ? "text-green-700 font-semibold" : "text-red-700"}>
            {isThind ? (value ? "Yes" : "No") : (value ? "Common" : "No")}
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          {isThind ? (
            <XCircle className="h-5 w-5 text-red-500" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          )}
          <span className={!isThind ? "text-green-700 font-semibold" : "text-red-700"}>
            {isThind ? "Never" : "Common"}
          </span>
        </div>
      )
    }
    return <span className={isThind ? "font-bold text-navy" : "text-gray-600"}>{value}</span>
  }

  if (variant === "card") {
    return (
      <div className={`bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden ${className}`}>
        <div className="bg-gradient-to-r from-navy to-navy-600 p-4 text-white">
          <h3 className="font-bold text-lg">{title}</h3>
          <p className="text-white/80 text-sm">Thind Transport vs. Industry Average</p>
        </div>
        <div className="p-4 space-y-3">
          {comparisons.slice(0, 6).map((item, idx) => (
            <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <span className="text-sm text-gray-600">{item.feature}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-green-600">
                  {typeof item.thind === "boolean" ? (item.thind ? "✓" : "✗") : item.thind}
                </span>
                <span className="text-gray-400">vs</span>
                <span className="text-sm text-gray-500">
                  {typeof item.competitor === "boolean" ? (item.competitor ? "Sometimes" : "✗") : item.competitor}
                </span>
              </div>
            </div>
          ))}
        </div>
        {showCTA && (
          <div className="p-4 bg-gray-50 border-t border-gray-100">
            <Link 
              href="/apply"
              className="block w-full text-center py-3 bg-orange hover:bg-orange-600 text-white font-bold rounded-lg transition-colors"
            >
              Make the Switch →
            </Link>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-2xl shadow-xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-navy to-navy-600 p-6 text-white">
        <Badge className="mb-3 bg-orange/20 text-orange border-orange/30">
          <TrendingUp className="h-3 w-3 mr-1" />
          Why Drivers Switch
        </Badge>
        <h2 className="text-2xl md:text-3xl font-black mb-2">{title}</h2>
        <p className="text-white/80">
          Real differences that put more money in your pocket
        </p>
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Feature</th>
              <th className="px-6 py-4 text-center text-sm font-bold">
                <div className="inline-flex items-center gap-2 bg-orange/10 text-orange px-3 py-1 rounded-full">
                  <span>Thind Transport</span>
                </div>
              </th>
              <th className="px-6 py-4 text-center text-sm font-bold text-gray-500">Other Carriers</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {displayItems.map((item, idx) => (
              <motion.tr 
                key={item.feature}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`hover:bg-gray-50 transition-colors ${item.highlight ? 'bg-green-50/50' : ''}`}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {item.icon && <span className="text-gray-400">{item.icon}</span>}
                    <span className="font-medium text-gray-900">{item.feature}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex justify-center">
                    {renderValue(item.thind, true)}
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex justify-center">
                    {renderValue(item.competitor, false)}
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Expand button for compact variant */}
      {variant === "compact" && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full py-3 bg-gray-50 text-gray-600 font-semibold flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors border-t border-gray-200"
        >
          {expanded ? "Show Less" : "Show All Comparisons"}
          <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      )}

      {/* CTA */}
      {showCTA && (
        <div className="p-6 bg-gradient-to-r from-orange/5 to-orange/10 border-t border-orange/20">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="font-bold text-gray-900">Ready to earn more?</p>
              <p className="text-sm text-gray-600">Join drivers who made the smart switch</p>
            </div>
            <Link
              href="/apply"
              className="px-6 py-3 bg-orange hover:bg-orange-600 text-white font-bold rounded-lg transition-colors whitespace-nowrap"
            >
              Apply Now →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

