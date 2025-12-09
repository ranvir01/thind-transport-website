"use client"

import { motion } from "framer-motion"
import { AlertTriangle, TrendingDown, Clock, DollarSign } from "lucide-react"
import Link from "next/link"

const painPoints = [
  { icon: TrendingDown, text: "Keeping only 70% of your gross?" },
  { icon: Clock, text: "Tired of broken home time promises?" },
  { icon: AlertTriangle, text: "Sick of forced dispatch?" },
  { icon: DollarSign, text: "Hidden fees eating your paycheck?" },
]

export const PainPointBanner = () => {
  return (
    <section className="py-8 md:py-12 bg-gradient-to-r from-red-900 via-red-800 to-red-900 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="container px-4 relative z-10">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          {/* Pain Points */}
          <div className="flex flex-wrap justify-center lg:justify-start gap-4 md:gap-6">
            {painPoints.map((point, index) => {
              const Icon = point.icon
              return (
                <motion.div
                  key={point.text}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-2 text-white/90"
                >
                  <Icon className="w-4 h-4 text-red-300" />
                  <span className="text-sm md:text-base font-medium">{point.text}</span>
                </motion.div>
              )
            })}
          </div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
          >
            <Link
              href="#calculator"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-red-900 font-bold rounded-lg hover:bg-orange hover:text-white transition-all shadow-lg whitespace-nowrap"
            >
              See What You're Missing
              <span className="text-lg">→</span>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

