"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { ChevronUp } from "lucide-react"

export function BackToTop() {
  const pathname = usePathname()
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      // Show button after scrolling down 2-3 screen heights
      const scrollThreshold = window.innerHeight * 2
      setIsVisible(window.scrollY > scrollThreshold)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  if (pathname.startsWith("/hub") || pathname.startsWith("/track")) return null

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    })
  }

  return (
    <>
      {isVisible && (
        <button
          onClick={scrollToTop}
          className="motion-safe:animate-dropdown-in fixed bottom-24 right-4 z-40 md:bottom-6 md:right-6 w-12 h-12 bg-navy/90 hover:bg-navy text-white rounded-full shadow-lg flex items-center justify-center transition-colors backdrop-blur-sm border border-white/10"
          aria-label="Back to top"
        >
          <ChevronUp className="w-6 h-6" />
        </button>
      )}
    </>
  )
}
