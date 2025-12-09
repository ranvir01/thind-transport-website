"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { Phone, MessageCircle, Star, TrendingUp } from "lucide-react"
import { HiringCounter, RecentlyHiredTicker } from "@/components/features/RecentlyHiredTicker"
import { AggregateRating } from "@/components/features/ReviewBadges"
import { HeroBackground } from "./HeroBackground"

export const CinematicHero = () => {
  return (
    <section className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-navy">
      {/* Background Video - Memoized to prevent re-renders */}
      <HeroBackground />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center pt-24 pb-12 md:pt-32">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {/* Live Hiring Counter + Status Badge */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mb-4">
            <div className="inline-flex items-center gap-2 py-1.5 px-4 md:py-2 md:px-5 rounded-full bg-green-500/20 border border-green-500/30 backdrop-blur-sm text-green-400 font-bold tracking-wide text-xs md:text-sm">
              <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-green-400 animate-pulse" />
              Now Hiring • Immediate Openings
            </div>
            <div className="hidden sm:block h-4 w-px bg-white/20" />
            <HiringCounter className="text-white/90 text-sm md:text-base" />
          </div>

          {/* Pain Point Hook */}
          <p className="text-base md:text-xl text-white/90 mb-4 font-medium drop-shadow-md">
            Tired of keeping only 70%? Done with broken promises?
          </p>

          {/* Main Headline - SEO Optimized H1 */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.1] mb-6 drop-shadow-xl">
            Keep <span className="text-orange">91%</span> of Your Gross.
            <br />
            <span className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-white/90 block mt-2">
              Every Load. Every Week.
            </span>
          </h1>

          {/* Aggregate Rating Badge */}
          <AggregateRating className="mb-4 scale-90 md:scale-100" />
        </motion.div>

        {/* Value Proposition */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-8 leading-relaxed drop-shadow-md"
        >
          Family-owned since 2016. 2024 Cascadias. No forced dispatch. 
          <span className="block mt-1 text-white font-semibold">Real support from real people in Kent, WA.</span>
        </motion.p>

        {/* Primary CTA - Single Focus */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-3 justify-center items-center w-full max-w-lg mx-auto mb-6"
        >
          <Link 
            href="/apply" 
            className="w-full sm:w-auto px-8 py-4 bg-orange hover:bg-orange-600 text-white font-black text-lg rounded-xl transition-all transform hover:scale-105 shadow-cta hover:shadow-cta-hover text-center uppercase tracking-wide flex items-center justify-center gap-2"
          >
            <TrendingUp className="w-5 h-5" />
            Apply Now — Takes 2 Min
          </Link>
          {/* SMS Opt-in for quick callback */}
          <a 
            href="sms:+12067656300?body=Hi,%20I'm%20interested%20in%20driving%20for%20Thind%20Transport.%20Please%20call%20me%20back."
            className="w-full sm:w-auto px-6 py-4 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-5 h-5" />
            Text for Callback
          </a>
        </motion.div>

        {/* Secondary Actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex flex-row justify-center gap-3 mb-8 w-full max-w-lg mx-auto"
        >
          <Link 
            href="#calculator" 
            className="flex-1 px-4 py-3 bg-white/10 border border-white/20 hover:bg-white/20 text-white font-semibold rounded-lg transition-all backdrop-blur-sm text-sm flex items-center justify-center text-center"
          >
            Calculate Pay
          </Link>
          <a 
            href="tel:+12067656300" 
            className="flex-1 px-4 py-3 bg-white/10 border border-white/20 hover:bg-white/20 text-white font-semibold rounded-lg transition-all backdrop-blur-sm text-sm flex items-center justify-center gap-2"
          >
            <Phone className="w-4 h-4" />
            (206) 765-6300
          </a>
        </motion.div>

        {/* Recently Hired Ticker */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.45 }}
          className="mb-8"
        >
          <RecentlyHiredTicker variant="compact" className="justify-center" />
        </motion.div>

        {/* Stats Grid */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 max-w-3xl mx-auto"
        >
          {[
            { value: "91%", label: "Gross Split", sublabel: "Industry leading", highlight: true },
            { value: "100%", label: "Fuel Pass-through", sublabel: "No surprises" },
            { value: "2024", label: "Equipment", sublabel: "Cascadias" },
            { value: "A+", label: "Safety Rating", sublabel: "FMCSA Verified" },
          ].map((stat) => (
            <div 
              key={stat.label}
              className={`rounded-xl p-4 backdrop-blur-sm border ${
                stat.highlight 
                  ? 'bg-orange/20 border-orange/40' 
                  : 'bg-white/5 border-white/10'
              }`}
            >
              <div className={`text-2xl md:text-3xl font-black ${stat.highlight ? 'text-orange' : 'text-white'}`}>
                {stat.value}
              </div>
              <div className="text-xs text-white/90 font-semibold mt-1">{stat.label}</div>
              <div className="text-xs text-white/70">{stat.sublabel}</div>
            </div>
          ))}
        </motion.div>

        {/* Trust Proof */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-white/80 pb-24"
        >
          {[
            "Weekly Direct Deposit",
            "No Hidden Fees", 
            "USDOT #3154006",
          ].map((item) => (
            <span key={item} className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              {item}
            </span>
          ))}
        </motion.div>
      </div>

      {/* Scroll Indicator - Hidden on mobile due to bottom nav */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="absolute bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-10 hidden md:block"
      >
        <div className="flex flex-col items-center gap-2 text-white/70">
          <span className="text-xs uppercase tracking-widest font-medium">Scroll to learn more</span>
          <motion.div 
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="w-6 h-10 border-2 border-white/20 rounded-full flex justify-center pt-2"
          >
            <div className="w-1.5 h-3 bg-white/40 rounded-full" />
          </motion.div>
        </div>
      </motion.div>
    </section>
  )
}
