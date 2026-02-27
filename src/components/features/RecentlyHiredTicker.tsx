"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { UserCheck, MapPin } from "lucide-react"

// Simulated recent hires - in production, this would come from an API
const recentHires = [
  { name: "Marcus J.", city: "Portland", state: "OR", role: "O/O", timeAgo: "2 hours ago" },
  { name: "David K.", city: "Seattle", state: "WA", role: "O/O", timeAgo: "5 hours ago" },
  { name: "Robert T.", city: "Boise", state: "ID", role: "Company", timeAgo: "Yesterday" },
  { name: "James W.", city: "Tacoma", state: "WA", role: "O/O", timeAgo: "2 days ago" },
  { name: "Michael S.", city: "Spokane", state: "WA", role: "O/O", timeAgo: "3 days ago" },
  { name: "Anthony L.", city: "Salem", state: "OR", role: "Company", timeAgo: "4 days ago" },
  { name: "Christopher P.", city: "Kent", state: "WA", role: "O/O", timeAgo: "5 days ago" },
  { name: "Daniel R.", city: "Olympia", state: "WA", role: "O/O", timeAgo: "1 week ago" },
]

interface RecentlyHiredTickerProps {
  variant?: "compact" | "full"
  className?: string
}

export const RecentlyHiredTicker = ({ variant = "compact", className = "" }: RecentlyHiredTickerProps) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(false)
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % recentHires.length)
        setIsVisible(true)
      }, 300)
    }, 4000)

    return () => clearInterval(interval)
  }, [])

  const currentHire = recentHires[currentIndex]

  if (variant === "compact") {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <span className="relative flex h-2 w-2 flex-shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
        </span>
        <AnimatePresence mode="wait">
          {isVisible && (
            <motion.span
              key={currentIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="text-sm text-white/90 flex items-center gap-1"
            >
              <span className="font-semibold text-white">{currentHire.name}</span>
              <span className="text-white/70"> just hired • {currentHire.city}, {currentHire.state}</span>
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <div className={`bg-green-500/10 border border-green-500/30 rounded-xl p-4 ${className}`}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
          <UserCheck className="w-5 h-5 text-green-400" />
        </div>
        <AnimatePresence mode="wait">
          {isVisible && (
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <p className="text-white font-bold">{currentHire.name}</p>
              <p className="text-sm text-white/70 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {currentHire.city}, {currentHire.state} • {currentHire.role} • {currentHire.timeAgo}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// Stats counter component
interface HiringCounterProps {
  className?: string
}

export const HiringCounter = ({ className = "" }: HiringCounterProps) => {
  const [count, setCount] = useState(47)
  
  // Simulate occasional increment
  useEffect(() => {
    const maybeIncrement = () => {
      if (Math.random() > 0.7) {
        setCount(c => c + 1)
      }
    }
    
    const interval = setInterval(maybeIncrement, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
      </span>
      <span className="text-sm">
        <span className="font-bold text-white">{count} drivers</span>
        <span className="text-white/70"> hired this month</span>
      </span>
    </div>
  )
}

