"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { X, DollarSign, Gift, Clock, Truck, CheckCircle2, Star, Phone, Users, TrendingUp, Zap } from "lucide-react"
import { COMPANY_INFO } from "@/lib/constants"

interface ExitIntentPopupProps {
  variant?: "bonus" | "calculator" | "testimonial"
}

export function ExitIntentPopup({ variant = "bonus" }: ExitIntentPopupProps) {
  const [showPopup, setShowPopup] = useState(false)
  const [hasShown, setHasShown] = useState(false)
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    // Check if already shown in this session
    if (typeof window !== "undefined") {
      const shown = sessionStorage.getItem("exitIntentShown")
      if (shown) {
        setHasShown(true)
        return
      }
    }

    const handleMouseLeave = (e: MouseEvent) => {
      // Only trigger if mouse is moving upward (toward address bar)
      if (e.clientY <= 0 && !hasShown) {
        setShowPopup(true)
        if (typeof window !== "undefined") {
          sessionStorage.setItem("exitIntentShown", "true")
        }
        setHasShown(true)
      }
    }

    // Also trigger on mobile after scroll back
    let lastScrollY = window.scrollY
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      if (currentScrollY < lastScrollY - 200 && currentScrollY > 500 && !hasShown) {
        setShowPopup(true)
        if (typeof window !== "undefined") {
          sessionStorage.setItem("exitIntentShown", "true")
        }
        setHasShown(true)
      }
      lastScrollY = currentScrollY
    }

    document.addEventListener("mouseleave", handleMouseLeave)
    window.addEventListener("scroll", handleScroll)
    return () => {
      document.removeEventListener("mouseleave", handleMouseLeave)
      window.removeEventListener("scroll", handleScroll)
    }
  }, [hasShown])

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle email submission
    setSubmitted(true)
    setTimeout(() => setShowPopup(false), 2000)
  }

  if (!showPopup) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[120] flex items-center justify-center p-4"
        onClick={() => setShowPopup(false)}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden relative max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button - always visible */}
          <button
            onClick={() => setShowPopup(false)}
            className="absolute top-2 right-2 z-30 w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors shadow-lg border border-gray-200"
            aria-label="Close popup"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Scrollable content wrapper */}
          <div className="overflow-y-auto flex-1">
            {/* Urgency Banner */}
            <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white py-2 px-4 pr-14 text-center">
              <p className="text-sm font-bold flex items-center justify-center gap-2">
                <Zap className="h-4 w-4" />
                Limited Time: Only 3 O/O spots left for I-5 corridor!
              </p>
            </div>

          {/* Header */}
          <div className="bg-gradient-to-br from-navy via-navy-600 to-navy p-6 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange/20 via-transparent to-transparent" />
            <div className="relative">
              <Badge className="mb-3 bg-orange/20 text-orange border-orange/30 text-xs">
                <Gift className="h-3 w-3 mr-1" />
                Exclusive Offer
              </Badge>
              <h3 className="text-2xl md:text-3xl font-black mb-2 text-white">
                <span className="text-orange">Wait!</span> You're Missing Out on <span className="text-orange">$35K+ More</span>
              </h3>
              <p className="text-white/80 text-sm">
                Drivers who switched to us earn an average of $35,000 more per year
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {submitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6"
              >
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <h4 className="text-xl font-bold text-gray-900 mb-2">You're All Set!</h4>
                <p className="text-gray-600">A recruiter will call you within 2 hours.</p>
              </motion.div>
            ) : (
              <>
                {/* Benefits */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {[
                    { icon: DollarSign, label: "91% Commission", sublabel: "Industry leading" },
                    { icon: Gift, label: "$2,500 Bonus", sublabel: "Sign-on bonus" },
                    { icon: Clock, label: "Same Day Pay", sublabel: "When you need it" },
                    { icon: Truck, label: "2024 Equipment", sublabel: "Latest models" },
                  ].map((item, i) => (
                    <div key={i} className="bg-gray-50 rounded-xl p-3 text-center">
                      <item.icon className="h-6 w-6 text-orange mx-auto mb-1" />
                      <p className="font-bold text-sm text-gray-900">{item.label}</p>
                      <p className="text-xs text-gray-500">{item.sublabel}</p>
                    </div>
                  ))}
                </div>

                {/* Social Proof */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 mb-6 border border-green-200">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex -space-x-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-navy to-blue-700 border-2 border-white flex items-center justify-center text-white text-xs font-bold">
                          {['DM', 'CR', 'MJ'][i-1]}
                        </div>
                      ))}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="h-4 w-4 fill-orange text-orange" />
                        ))}
                      </div>
                      <p className="text-xs text-green-700 font-medium">47 drivers hired this month</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 italic">
                    "Best decision I made. Making $35K more than my last company." — Marcus J.
                  </p>
                </div>

                {/* CTAs */}
                <div className="space-y-3">
                  <Button 
                    asChild 
                    className="w-full bg-gradient-to-r from-orange to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-6 text-lg shadow-lg shadow-orange/30" 
                    size="lg"
                  >
                    <Link href="/apply" onClick={() => setShowPopup(false)}>
                      <TrendingUp className="h-5 w-5 mr-2" />
                      See My Earning Potential
                    </Link>
                  </Button>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      asChild
                      variant="outline"
                      className="border-navy text-navy hover:bg-navy/5 font-semibold"
                      size="lg"
                    >
                      <Link href="/pay-rates#calculator" onClick={() => setShowPopup(false)}>
                        <DollarSign className="h-4 w-4 mr-1" />
                        Calculate Pay
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="border-green-600 text-green-600 hover:bg-green-50 font-semibold"
                      size="lg"
                    >
                      <a href={`tel:${COMPANY_INFO.phoneFormatted}`}>
                        <Phone className="h-4 w-4 mr-1" />
                        Call Now
                      </a>
                    </Button>
                  </div>

                  <button
                    onClick={() => setShowPopup(false)}
                    className="w-full text-sm text-gray-500 hover:text-gray-700 font-medium py-2 transition-colors"
                  >
                    No thanks, I prefer earning less
                  </button>
                </div>
              </>
            )}
          </div>

            {/* Trust Footer */}
            <div className="bg-gray-50 px-6 py-3 border-t border-gray-100">
              <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  2hr Response
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  No Obligation
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  Secure
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
