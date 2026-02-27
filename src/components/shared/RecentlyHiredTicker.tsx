"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle2, MapPin, Clock, Users } from "lucide-react"

interface HiredDriver {
  name: string
  location: string
  type: string
  time: string
  initials: string
}

const recentHires: HiredDriver[] = [
  { name: "David M.", location: "Seattle, WA", type: "Owner Operator", time: "2 hours ago", initials: "DM" },
  { name: "Carlos R.", location: "Portland, OR", type: "Company Driver", time: "5 hours ago", initials: "CR" },
  { name: "Marcus J.", location: "Phoenix, AZ", type: "Owner Operator", time: "Yesterday", initials: "MJ" },
  { name: "Jennifer T.", location: "Denver, CO", type: "Company Driver", time: "Yesterday", initials: "JT" },
  { name: "Robert K.", location: "Salt Lake City, UT", type: "Owner Operator", time: "2 days ago", initials: "RK" },
  { name: "Sarah L.", location: "Los Angeles, CA", type: "Company Driver", time: "2 days ago", initials: "SL" },
  { name: "Mike W.", location: "Tacoma, WA", type: "Owner Operator", time: "3 days ago", initials: "MW" },
  { name: "Amanda P.", location: "Spokane, WA", type: "Company Driver", time: "3 days ago", initials: "AP" },
]

interface RecentlyHiredTickerProps {
  variant?: "compact" | "full" | "popup"
  className?: string
}

export function RecentlyHiredTicker({ variant = "full", className = "" }: RecentlyHiredTickerProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showPopup, setShowPopup] = useState(false)

  // Rotate through recent hires
  useEffect(() => {
    if (variant === "popup") {
      // Show popup after 5 seconds, then hide after 4 seconds
      const showTimer = setTimeout(() => setShowPopup(true), 5000)
      return () => clearTimeout(showTimer)
    }
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % recentHires.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [variant])

  // Auto-hide popup
  useEffect(() => {
    if (showPopup) {
      const hideTimer = setTimeout(() => setShowPopup(false), 5000)
      return () => clearTimeout(hideTimer)
    }
  }, [showPopup])

  if (variant === "popup") {
    return (
      <AnimatePresence>
        {showPopup && (
          <motion.div
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -100, opacity: 0 }}
            className="hidden lg:block fixed bottom-24 left-4 z-40 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 max-w-xs"
          >
            <button
              onClick={() => setShowPopup(false)}
              className="absolute -top-2 -right-2 bg-gray-100 rounded-full p-1 text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                {recentHires[currentIndex].initials}
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{recentHires[currentIndex].name}</p>
                <p className="text-xs text-gray-500">{recentHires[currentIndex].location}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-green-700 font-medium">Just hired as {recentHires[currentIndex].type}</span>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">{recentHires[currentIndex].time}</p>
          </motion.div>
        )}
      </AnimatePresence>
    )
  }

  if (variant === "compact") {
    return (
      <div className={`flex items-center gap-2 text-sm ${className}`}>
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <AnimatePresence mode="wait">
          <motion.span
            key={currentIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-inherit flex items-center gap-1"
          >
            <span className="font-semibold text-white">{recentHires[currentIndex].name}</span>
            <span className="text-white/80">just joined from {recentHires[currentIndex].location}</span>
          </motion.span>
        </AnimatePresence>
      </div>
    )
  }

  // Full variant
  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-lg p-4 ${className}`}>
      <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">
        <Users className="h-4 w-4" />
        Recently Hired
      </div>
      <div className="space-y-3">
        {recentHires.slice(0, 4).map((hire, i) => (
          <motion.div
            key={hire.name}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-center gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center text-white font-semibold text-xs">
              {hire.initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 text-sm truncate">{hire.name}</p>
              <p className="text-xs text-gray-500">{hire.location} • {hire.type}</p>
            </div>
            <div className="flex items-center gap-1 text-xs text-green-600">
              <Clock className="h-3 w-3" />
              {hire.time}
            </div>
          </motion.div>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t border-gray-100 text-center">
        <p className="text-xs text-gray-500">
          <span className="font-bold text-orange">47+</span> drivers hired this month
        </p>
      </div>
    </div>
  )
}

