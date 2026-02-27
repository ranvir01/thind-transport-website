"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Phone, FileText, ChevronUp, MessageCircle, Zap } from "lucide-react"
import { COMPANY_INFO } from "@/lib/constants"

interface StickyMobileCTAProps {
  variant?: "apply" | "call" | "both"
  showAfterScroll?: number
}

export function StickyMobileCTA({ 
  variant = "both",
  showAfterScroll = 300 
}: StickyMobileCTAProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [showExpandedOptions, setShowExpandedOptions] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > showAfterScroll)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [showAfterScroll])

  // Hide on Apply page as it has its own dedicated sticky footer
  if (pathname === '/apply') return null

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
        >
          {/* Expanded Options */}
          <AnimatePresence>
            {showExpandedOptions && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="bg-white border-t border-gray-200 shadow-lg p-4 space-y-3"
              >
                <a
                  href={`sms:${COMPANY_INFO.phoneFormatted}?body=Hi, I'm interested in driving for Thind Transport`}
                  className="flex items-center gap-3 p-3 min-h-[44px] bg-green-50 rounded-xl text-green-700 font-semibold hover:bg-green-100 transition-colors"
                >
                  <MessageCircle className="h-5 w-5" />
                  <span>Text Us</span>
                </a>
                <Link
                  href="/pay-rates#calculator"
                  className="flex items-center gap-3 p-3 min-h-[44px] bg-blue-50 rounded-xl text-blue-700 font-semibold hover:bg-blue-100 transition-colors"
                  onClick={() => setShowExpandedOptions(false)}
                >
                  <Zap className="h-5 w-5" />
                  <span>Calculate Your Pay</span>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main CTA Bar - Clean & Simple */}
          <div className="bg-gradient-to-r from-navy via-navy-600 to-navy p-3 shadow-2xl border-t border-white/10 safe-area-bottom">
            {/* CTA Buttons - Full Width, No Clutter */}
            <div className="flex gap-2">
              {(variant === "call" || variant === "both") && (
                <a
                  href={`tel:${COMPANY_INFO.phoneFormatted}`}
                  className="flex-1 flex items-center justify-center gap-2 bg-white/20 border border-white/30 text-white font-bold py-3.5 px-4 rounded-xl hover:bg-white/30 active:bg-white/40 transition-colors text-sm min-h-[48px]"
                >
                  <Phone className="h-5 w-5" />
                  <span>Call Now</span>
                </a>
              )}
              
              {(variant === "apply" || variant === "both") && (
                <Link
                  href="/apply"
                  className="flex-1 flex items-center justify-center gap-2 bg-orange hover:bg-orange-600 active:bg-orange-700 text-white font-bold py-3.5 px-4 rounded-xl transition-colors shadow-lg shadow-orange/30 text-sm min-h-[48px]"
                >
                  <FileText className="h-5 w-5" />
                  <span className="relative">
                    Apply Now
                    <span className="absolute -top-1 -right-3 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  </span>
                </Link>
              )}

              {/* Expand button */}
              <button
                onClick={() => setShowExpandedOptions(!showExpandedOptions)}
                className="bg-white/20 border border-white/30 text-white p-3.5 rounded-xl hover:bg-white/30 active:bg-white/40 transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center"
                aria-label="More options"
              >
                <ChevronUp className={`h-5 w-5 transition-transform ${showExpandedOptions ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

