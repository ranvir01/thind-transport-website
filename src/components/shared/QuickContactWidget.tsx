"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { MessageCircle, Phone, X, Mail, Clock, FileText, ChevronRight } from "lucide-react"
import { COMPANY_INFO } from "@/lib/constants"
import { motion, AnimatePresence } from "framer-motion"

export function QuickContactWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

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

  return (
    <>
      {/* Floating Contact Button - Hidden on mobile since MobileCommandBar handles CTAs */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed z-[95] rounded-full shadow-2xl transition-all
          ${isMobile 
            ? 'bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] left-4 p-3 bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20' 
            : 'bottom-6 left-6 p-4 bg-gradient-to-r from-[#001F3F] to-[#003366] hover:from-[#003366] hover:to-[#004080] text-white'
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
              <Card className="overflow-hidden border-0 bg-white dark:bg-slate-900">
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white">Get in Touch</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">We're here to help</p>
                    </div>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      aria-label="Close contact panel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    <a
                      href={`tel:${COMPANY_INFO.phoneFormatted}`}
                      className="flex items-center gap-3 p-3 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl hover:from-emerald-100 hover:to-teal-100 dark:hover:from-emerald-900/30 dark:hover:to-teal-900/30 transition-all group"
                    >
                      <div className="bg-emerald-500 p-2.5 rounded-xl group-hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/25">
                        <Phone className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 dark:text-white">{COMPANY_INFO.phone}</div>
                        <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Available 24/7</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" />
                    </a>

                    <a
                      href={`mailto:${COMPANY_INFO.email}`}
                      className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30 transition-all group"
                    >
                      <div className="bg-blue-500 p-2.5 rounded-xl group-hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/25">
                        <Mail className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 dark:text-white">Email Us</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{COMPANY_INFO.email}</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                    </a>

                    <Link
                      href="/apply"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 p-3 bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl hover:from-orange-600 hover:to-amber-600 transition-all group shadow-lg shadow-orange-500/25"
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

                  <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
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
