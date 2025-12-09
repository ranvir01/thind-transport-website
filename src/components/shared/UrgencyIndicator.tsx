"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Clock, Users, AlertCircle } from "lucide-react"

export function UrgencyIndicator() {
  const [spotsLeft, setSpotsLeft] = useState(3)
  const [applicantsToday, setApplicantsToday] = useState(12)

  useEffect(() => {
    // Simulate real-time updates
    const interval = setInterval(() => {
      if (spotsLeft > 0 && Math.random() > 0.7) {
        setSpotsLeft(prev => Math.max(0, prev - 1))
      }
      if (Math.random() > 0.8) {
        setApplicantsToday(prev => prev + Math.floor(Math.random() * 3))
      }
    }, 10000)

    return () => clearInterval(interval)
  }, [spotsLeft])

  if (spotsLeft === 0) return null

  return (
    <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-red-600 p-2 rounded-lg">
            <AlertCircle className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-red-900">
              Only <span className="text-2xl">{spotsLeft}</span> positions left this month
            </div>
            <div className="text-sm text-red-700">
              {applicantsToday} drivers applied today
            </div>
          </div>
        </div>
        <Badge className="bg-red-600 text-white animate-pulse">
          <Clock className="h-3 w-3 mr-1" />
          Act Fast
        </Badge>
      </div>
    </div>
  )
}
