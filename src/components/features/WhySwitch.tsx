"use client"

import { motion } from "framer-motion"
import { Check, X, ArrowRight } from "lucide-react"
import Link from "next/link"

const comparisonData = [
  {
    feature: "Pay Split",
    competitor: "65-75% Gross",
    thind: "91% Gross",
    highlight: true,
  },
  {
    feature: "Fuel Surcharge",
    competitor: "Partial Pass-through",
    thind: "100% Pass-through",
    highlight: true,
  },
  {
    feature: "Forced Dispatch",
    competitor: "Yes",
    thind: "Never",
    competitorBad: true,
  },
  {
    feature: "Home Time",
    competitor: "When convenient",
    thind: "Your schedule, honored",
    competitorBad: true,
  },
  {
    feature: "Equipment Age",
    competitor: "5-10 year old trucks",
    thind: "2024 Cascadias",
    highlight: true,
  },
  {
    feature: "Dispatch Response",
    competitor: "Call center queue",
    thind: "Direct line, real person",
    competitorBad: true,
  },
  {
    feature: "Pay Timeline",
    competitor: "Net 30-45 days",
    thind: "Weekly direct deposit",
    highlight: true,
  },
  {
    feature: "Hidden Fees",
    competitor: "ELD, compliance, admin",
    thind: "$0 hidden fees",
    competitorBad: true,
  },
]

export const WhySwitch = () => {
  return (
    <section className="py-20 md:py-28 bg-white">
      <div className="container px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12 md:mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-orange/10 text-orange font-semibold text-sm mb-4">
            Side-by-Side Comparison
          </span>
          <h2 className="text-3xl md:text-5xl font-black text-navy mb-4">
            Why Drivers <span className="text-orange">Switch</span> to Thind
          </h2>
          <p className="text-lg text-steel max-w-2xl mx-auto">
            Stop leaving money on the table. See how we stack up against the mega-carriers.
          </p>
        </motion.div>

        {/* Comparison Table */}
        <div className="max-w-4xl mx-auto">
          {/* Table Header */}
          <div className="grid grid-cols-3 gap-4 mb-4 px-4">
            <div className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
              Feature
            </div>
            <div className="text-center text-sm font-semibold text-gray-500 uppercase tracking-wider">
              Mega Carriers
            </div>
            <div className="text-center text-sm font-semibold text-orange uppercase tracking-wider">
              Thind Transport
            </div>
          </div>

          {/* Table Rows */}
          <div className="space-y-2">
            {comparisonData.map((row, index) => (
              <motion.div
                key={row.feature}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className={`grid grid-cols-3 gap-4 items-center p-4 rounded-xl ${
                  row.highlight ? 'bg-orange/5 border border-orange/20' : 'bg-neutral-50'
                }`}
              >
                <div className="font-semibold text-navy">{row.feature}</div>
                <div className="text-center flex items-center justify-center gap-2">
                  {row.competitorBad && (
                    <X className="w-4 h-4 text-red-500 flex-shrink-0" />
                  )}
                  <span className={`text-sm ${row.competitorBad ? 'text-red-600' : 'text-gray-600'}`}>
                    {row.competitor}
                  </span>
                </div>
                <div className="text-center flex items-center justify-center gap-2">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className={`text-sm font-semibold ${row.highlight ? 'text-orange' : 'text-green-700'}`}>
                    {row.thind}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Bottom Callout */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-8 p-6 bg-navy rounded-2xl text-center"
          >
            <p className="text-white/80 mb-4">
              On average, owner operators earn <span className="text-orange font-bold">$35,000+ more per year</span> with our 91% split.
            </p>
            <Link
              href="/apply"
              className="inline-flex items-center gap-2 px-8 py-4 bg-orange hover:bg-orange-600 text-white font-bold rounded-lg transition-all shadow-cta hover:shadow-cta-hover"
            >
              Calculate Your Earnings
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

