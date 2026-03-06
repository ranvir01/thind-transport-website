"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Card } from "@/components/ui/card"
import { MessageCircle, Phone, X, Mail, Clock, FileText, ChevronRight } from "lucide-react"
import { COMPANY_INFO } from "@/lib/constants"
import { motion, AnimatePresence } from "framer-motion"

export function QuickContactWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const pathname = usePathname()

  // Detect mobile for positioning
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Close when clicking escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [])

  // Hide on Apply page to reduce clutter
  if (pathname === '/apply') return null

  return (
    <>
      {/* Floating Contact Button - Hidden on mobile since MobileCommandBar handles CTAs */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed z-[95] rounded-full shadow-2xl transition-all
          ${isMobile 
            ? 'bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] left-4 p-3 bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20' 
            : 'bottom-6 left-6 p-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white'
          }
        `}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Contact us"
        aria-expanded={isOpen}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X className={isMobile ? "h-5 w-5" : "h-6 w-6"} />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <MessageCircle className={isMobile ? "h-5 w-5" : "h-6 w-6"} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Contact Widget Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop for mobile */}
            {isMobile && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[96]"
                onClick={() => setIsOpen(false)}
              />
            )}
            
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className={`fixed z-[97] shadow-2xl
                ${isMobile 
                  ? 'inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))]' 
                  : 'bottom-24 left-6 w-80'
                }
              `}
            >
              <Card className="overflow-hidden border-0 bg-[linear-gradient(180deg,rgba(20,31,47,0.98),rgba(11,20,34,0.98))]">
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-display text-2xl font-bold text-white">Get in Touch</h3>
                      <p className="text-xs text-steel-300">We're here to help</p>
                    </div>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="p-1.5 rounded-full hover:bg-white/10 text-steel-300 hover:text-white transition-colors"
                      aria-label="Close contact panel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    <a
                      href={`tel:${COMPANY_INFO.phoneFormatted}`}
                      className="flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all group border border-white/10"
                    >
                      <div className="bg-orange-500 p-2.5 rounded-xl group-hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/25">
                        <Phone className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-white">{COMPANY_INFO.phone}</div>
                        <div className="text-xs text-orange-300 font-medium">Available 24/7</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-steel-300 group-hover:text-orange-400 group-hover:translate-x-0.5 transition-all" />
                    </a>

                    <a
                      href={`mailto:${COMPANY_INFO.email}`}
                      className="flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all group border border-white/10"
                    >
                      <div className="bg-white/10 p-2.5 rounded-xl group-hover:bg-white/15 transition-colors shadow-lg shadow-black/20">
                        <Mail className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-white">Email Us</div>
                        <div className="text-xs text-steel-300 truncate">{COMPANY_INFO.email}</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-steel-300 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                    </a>

                    <Link
                      href="/apply"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 p-3 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl hover:from-orange-400 hover:to-orange-500 transition-all group shadow-lg shadow-orange-500/25"
                    >
                      <div className="bg-white/20 p-2.5 rounded-xl">
                        <FileText className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-white">Quick Application</div>
                        <div className="text-xs text-white/80">Takes 60 seconds</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-white/80 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                    </Link>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/10">
                    <div className="flex items-center gap-2 text-xs text-steel-300">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Typical response: Within 24 hours</span>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
