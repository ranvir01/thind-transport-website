"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { TruckIcon, TrendingUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"

// TO INTEGRATE WITH REAL LOADS:
// 1. Replace the sampleLoads array with an API call to your load board system
// 2. Use useEffect to fetch from your API endpoint (e.g., /api/loads)
// 3. Add proper error handling and loading states
// 4. Consider using SWR or React Query for automatic revalidation
// Example:
// const { data: loads } = useSWR('/api/loads', fetcher, { refreshInterval: 30000 })

interface Load {
  id: string
  origin: string
  destination: string
  rate: string
  distance: string
  type: string
  urgent?: boolean
}

export function LiveLoadTracker() {
  const [loads, setLoads] = useState<Load[]>([
    { id: "L001", origin: "Seattle, WA", destination: "Los Angeles, CA", rate: "$3,200", distance: "1,137 mi", type: "Flatbed", urgent: true },
    { id: "L002", origin: "Portland, OR", destination: "Phoenix, AZ", rate: "$2,800", distance: "1,423 mi", type: "Dry Van" },
    { id: "L003", origin: "Kent, WA", destination: "Denver, CO", rate: "$2,450", distance: "1,323 mi", type: "Reefer" },
  ])
  const [highlightedLoad, setHighlightedLoad] = useState(0)

  useEffect(() => {
    // Rotate through loads
    const interval = setInterval(() => {
      setHighlightedLoad((prev) => (prev + 1) % loads.length)
      
      // Occasionally update load data to simulate real-time changes
      if (Math.random() > 0.7) {
        setLoads(prev => {
          const newLoads = [...prev]
          const randomIndex = Math.floor(Math.random() * newLoads.length)
          // Simulate rate changes
          const currentRate = parseInt(newLoads[randomIndex].rate.replace(/\$|,/g, ''))
          const change = Math.floor(Math.random() * 200) - 100
          newLoads[randomIndex] = {
            ...newLoads[randomIndex],
            rate: `$${(currentRate + change).toLocaleString()}`
          }
          return newLoads
        })
      }
    }, 4000)

    return () => clearInterval(interval)
  }, [loads.length])

  const currentLoad = loads[highlightedLoad]

  return (
    <Link 
      href="/load-board" 
      className="group bg-gradient-to-br from-gray-50 via-blue-50/50 to-gray-50 hover:from-blue-50 hover:via-blue-100/50 hover:to-gray-50 rounded-lg px-2.5 py-1.5 transition-all duration-300 border border-gray-200 hover:border-blue-300 hover:shadow-sm min-w-[260px]"
    >
      <div className="flex items-center gap-2">
        <div className="relative flex-shrink-0">
          <div className="bg-blue-100 p-1 rounded-md group-hover:bg-blue-200 transition-colors">
            <TruckIcon className="h-3 w-3 text-blue-600" />
          </div>
          <div className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 bg-green-500 rounded-full border border-white animate-pulse"></div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 mb-0.5">
            <span className="text-[9px] font-bold text-gray-700 uppercase tracking-wide whitespace-nowrap">LIVE LOAD</span>
            <span className="text-[11px] text-gray-800 truncate font-semibold whitespace-nowrap">
              {currentLoad.origin.split(',')[0]} → {currentLoad.destination.split(',')[0]}
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-black text-xs text-green-600 leading-none whitespace-nowrap">{currentLoad.rate}</span>
            <span className="text-[9px] text-gray-700 font-semibold whitespace-nowrap">{currentLoad.distance}</span>
            <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 border-gray-300 whitespace-nowrap">{currentLoad.type}</Badge>
            {currentLoad.urgent && (
              <Badge className="bg-red-500 text-white text-[9px] px-1 py-0 h-3.5 font-bold animate-pulse whitespace-nowrap">
                Urgent
              </Badge>
            )}
          </div>
        </div>
        <TrendingUp className="h-3.5 w-3.5 text-gray-600 group-hover:text-blue-600 transition-colors flex-shrink-0" />
      </div>
      
      {/* Progress indicator */}
      <div className="mt-1 h-0.5 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 animate-progress-bar"
          key={highlightedLoad}
        />
      </div>
    </Link>
  )
}
