"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Users, TrendingUp, Clock, Zap } from "lucide-react"

interface LiveHiringCounterProps {
  variant?: "hero" | "badge" | "inline"
  className?: string
}

export function LiveHiringCounter({ variant = "hero", className = "" }: LiveHiringCounterProps) {
  const [count, setCount] = useState(47)
  const [isAnimating, setIsAnimating] = useState(false)

  // Simulate occasional count increase
  useEffect(() => {
    const interval = setInterval(() => {
      // 10% chance of incrementing every 30 seconds
      if (Math.random() < 0.1) {
        setIsAnimating(true)
        setCount(prev => prev + 1)
        setTimeout(() => setIsAnimating(false), 1000)
      }
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  if (variant === "badge") {
    return (
      <motion.div
        animate={isAnimating ? { scale: [1, 1.1, 1] } : {}}
        className={`inline-flex items-center gap-2 bg-green-500/20 border border-green-500/40 backdrop-blur-sm text-green-300 px-4 py-2 rounded-full text-sm font-bold ${className}`}
      >
        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
        <span>{count} drivers hired this month</span>
      </motion.div>
    )
  }

  if (variant === "inline") {
    return (
      <motion.span
        animate={isAnimating ? { scale: [1, 1.05, 1] } : {}}
        className={`inline-flex items-center gap-1 ${className}`}
      >
        <Users className="h-4 w-4" />
        <span className="font-bold">{count}</span>
        <span className="text-gray-600">drivers hired this month</span>
      </motion.span>
    )
  }

  // Hero variant
  return (
    <motion.div
      animate={isAnimating ? { scale: [1, 1.02, 1] } : {}}
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20 p-6 ${className}`}
    >
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 via-transparent to-green-500/5 animate-pulse" />
      
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs font-bold text-green-700 uppercase tracking-wider">Live Hiring</span>
          </div>
          <TrendingUp className="h-5 w-5 text-green-600" />
        </div>

        <div className="flex items-end gap-4">
          <motion.div
            key={count}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-5xl font-black text-green-700"
          >
            {count}
          </motion.div>
          <div className="pb-2">
            <p className="font-semibold text-gray-900">Drivers Hired</p>
            <p className="text-sm text-gray-600">This Month</p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1 text-gray-600">
            <Clock className="h-4 w-4" />
            <span>Avg. 2hr response</span>
          </div>
          <div className="flex items-center gap-1 text-orange">
            <Zap className="h-4 w-4" />
            <span className="font-semibold">Hiring Now</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

