"use client"

import { motion } from "framer-motion"
import { Check, X, ArrowRight } from "lucide-react"
import Link from "next/link"

const comparisonData = [
  {
    feature: "Pay Split",
    competitor: "65-75% Gross",
    thind: "90% Gross",
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
    <section className="relative py-20 md:py-28 overflow-hidden">
      <div className="accent-orb -top-10 right-0 h-72 w-72 bg-orange-600/15" />
      <div className="accent-orb bottom-0 -left-10 h-72 w-72 bg-gold-600/10" />
      <div className="container relative px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="fleet-section-heading"
        >
          <span className="fleet-badge mb-4">Side-by-side comparison</span>
          <h2 className="text-white mb-4">
            Why drivers <span className="text-orange">switch</span> to Thind
          </h2>
          <p className="text-lg text-steel-300 max-w-2xl mx-auto">
            We&apos;re not a mega-carrier call center. See how our pay and support compare.
          </p>
        </motion.div>

        {/* Comparison - Card View on Mobile, Table on Desktop */}
        <div className="max-w-4xl mx-auto">
          {/* Desktop Table Header - Hidden on Mobile */}
          <div className="hidden md:grid grid-cols-3 gap-4 mb-4 px-4">
            <div className="text-sm font-semibold text-steel-300 uppercase tracking-wider font-display">
              Feature
            </div>
            <div className="text-center text-sm font-semibold text-steel-500 uppercase tracking-wider font-display">
              Mega carriers
            </div>
            <div className="text-center text-sm font-semibold text-orange uppercase tracking-wider font-display">
              Thind Transport
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {comparisonData.map((row, index) => (
              <motion.div
                key={row.feature}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.03 }}
                className={`p-4 rounded-fleet-lg border ${
                  row.highlight ? 'fleet-stat-card--highlight' : 'fleet-stat-card'
                }`}
              >
                <div className="font-bold text-white text-base mb-3 border-b border-steel-700 pb-2 font-display uppercase tracking-wide text-sm">{row.feature}</div>
                <div className="space-y-3">
                  {/* Thind Line (First for emphasis) */}
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-orange uppercase tracking-wider block">Thind Transport</span>
                      <span className={`text-base font-bold ${row.highlight ? 'text-orange' : 'text-white'}`}>
                        {row.thind}
                      </span>
                    </div>
                  </div>

                  {/* Competitor Line */}
                  <div className="flex items-center gap-3 opacity-75">
                    <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                      <X className="w-4 h-4 text-red-500" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-steel-500 uppercase tracking-wider block">Competitors</span>
                      <span className="text-sm text-steel-400">
                        {row.competitor}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Desktop Table Rows - Hidden on Mobile */}
          <div className="hidden md:block space-y-2">
            {comparisonData.map((row, index) => (
              <motion.div
                key={row.feature}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className={`grid grid-cols-3 gap-4 items-center p-4 rounded-fleet-lg border ${
                  row.highlight ? 'fleet-stat-card--highlight' : 'fleet-stat-card'
                }`}
              >
                <div className="font-semibold text-white font-display">{row.feature}</div>
                <div className="text-center flex items-center justify-center gap-2">
                  {row.competitorBad && (
                    <X className="w-4 h-4 text-red-500 flex-shrink-0" />
                  )}
                  <span className={`text-sm ${row.competitorBad ? 'text-red-400' : 'text-steel-400'}`}>
                    {row.competitor}
                  </span>
                </div>
                <div className="text-center flex items-center justify-center gap-2">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className={`text-sm font-semibold ${row.highlight ? 'text-orange' : 'text-green-400'}`}>
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
            className="mt-8 p-6 fleet-panel fleet-panel-accent text-center"
          >
            <p className="text-steel-200 mb-4">
              On average, owner operators earn <span className="text-orange font-bold">$35,000+ more per year</span> with our 90% split.
            </p>
            <Link
              href="/apply"
              className="inline-flex items-center gap-2 px-8 py-4 bg-orange hover:bg-orange-400 text-white font-bold rounded-fleet transition-all hover:shadow-cta-hover shadow-cta font-display uppercase tracking-wide"
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

