"use client"

import Link from "next/link"
import Image from "next/image"
import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { 
  Menu, X, Phone, Truck, DollarSign, 
  Activity, Clock, Star, FileText, Navigation, ArrowRight, User
} from "lucide-react"
import { COMPANY_INFO } from "@/lib/constants"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { motion, AnimatePresence } from "framer-motion"

// Enhanced NavLink Component
function NavLink({ 
  href, 
  label, 
  icon, 
  badge,
  scrolled
}: { 
  href: string
  label: string
  icon?: React.ReactNode
  badge?: React.ReactNode
  scrolled: boolean
}) {
  const pathname = usePathname()
  const isActive = pathname === href || (href !== "/" && pathname.startsWith(href))
  
  return (
    <Link
      href={href}
      scroll={true}
      className={`
        relative px-4 py-2 rounded-full text-sm font-medium transition-all duration-300
        flex items-center gap-1.5 whitespace-nowrap group
        ${isActive 
          ? scrolled ? 'text-[#001F3F] bg-blue-50 font-bold' : 'text-white bg-white/20 font-bold'
          : scrolled ? 'text-gray-700 hover:text-[#001F3F] hover:bg-blue-50' : 'text-white/80 hover:text-white hover:bg-white/10'
        }
      `}
    >
      {icon && <span className={`flex-shrink-0 transition-colors ${isActive ? '' : ''}`}>{icon}</span>}
      <span>{label}</span>
      {badge && <span className="ml-0.5 flex-shrink-0">{badge}</span>}
      
      {/* Hover Underline Animation */}
      <span className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-0 h-0.5 rounded-full transition-all duration-300 group-hover:w-1/2 ${scrolled ? 'bg-[#001F3F]' : 'bg-[#FF9500]'}`}></span>
    </Link>
  )
}

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  // Handle scroll for glass effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled 
          ? "bg-white/95 backdrop-blur-md shadow-md py-2 border-b border-gray-100" 
          : "bg-transparent py-6"
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className={`relative transition-transform duration-300 ${scrolled ? 'scale-90' : 'scale-100'}`}>
              {/* Using CSS filter for white logo when not scrolled could be an option, but swapping or tinting is safer if we have assets. 
                  For now, we assume the logo looks okay or we wrap it in a light container if needed.
                  Given the brief, "Make the logo and text white". Let's try to filter it or use text if image isn't suitable for dark bg.
              */}
              <div className={`rounded-lg overflow-hidden ${scrolled ? '' : 'bg-white/10 backdrop-blur-sm p-1'}`}>
                 <Image
                  src="/ar-carrier-logo.png"
                  alt={`${COMPANY_INFO.name} Logo`}
                  width={40}
                  height={40}
                  className="object-contain"
                />
              </div>
            </div>
            <div className="leading-tight">
              <h1 className={`text-lg font-black tracking-tight transition-colors duration-300 ${scrolled ? 'text-[#001F3F]' : 'text-white'}`}>
                THIND TRANSPORT
              </h1>
              <p className={`text-[10px] font-medium uppercase tracking-widest transition-colors duration-300 ${scrolled ? 'text-gray-500' : 'text-white/80'}`}>
                Est. 2014 • Kent, WA
              </p>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1 bg-black/5 backdrop-blur-[2px] rounded-full p-1 border border-white/5 transition-all duration-300 hover:bg-black/10">
             {scrolled && <div className="absolute inset-0 bg-gray-100/50 rounded-full -z-10" />}
             <NavLink href="/" label="Home" scrolled={scrolled} />
             <NavLink href="/pay-rates" label="Pay Rates" icon={<DollarSign className="w-3 h-3" />} scrolled={scrolled} />
             <NavLink href="/routes" label="Routes" icon={<Truck className="w-3 h-3" />} scrolled={scrolled} />
             <NavLink href="/testimonials" label="Stories" icon={<Star className="w-3 h-3" />} scrolled={scrolled} />
             <NavLink href="/driver-portal" label="Driver Portal" icon={<User className="w-3 h-3" />} scrolled={scrolled} />
             <NavLink href="/pre-qualify" label="Pre-Qualify" icon={<FileText className="w-3 h-3" />} scrolled={scrolled} />
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-4">
             {/* Phone Number */}
             <a 
               href={`tel:${COMPANY_INFO.phoneFormatted}`}
               className={`hidden md:flex items-center gap-2 font-bold transition-colors ${scrolled ? 'text-[#001F3F] hover:text-[#FF9500]' : 'text-white hover:text-[#FF9500]'}`}
             >
               <Phone className="w-4 h-4" />
               <span>{COMPANY_INFO.phone}</span>
             </a>

             {/* Apply Button */}
             <Button 
               asChild
               className={`
                 font-bold rounded-full transition-all duration-300 shadow-lg hover:scale-105
                 ${scrolled 
                    ? 'bg-[#001F3F] hover:bg-[#003366] text-white' 
                    : 'bg-[#FF9500] hover:bg-[#FFAA33] text-[#001F3F]'
                 }
               `}
             >
               <Link href="/apply" className="flex items-center gap-2">
                 <span>Apply Now</span>
                 <ArrowRight className="w-4 h-4" />
               </Link>
             </Button>

             {/* Mobile Menu Toggle */}
             <button 
               onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
               className={`lg:hidden p-2 rounded-full transition-colors ${scrolled ? 'text-[#001F3F] hover:bg-gray-100' : 'text-white hover:bg-white/10'}`}
             >
               {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
             </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-white border-t border-gray-100 overflow-hidden shadow-xl"
          >
            <div className="container mx-auto p-4 space-y-4">
               <nav className="flex flex-col gap-2">
                  <MobileNavLink href="/" label="Home" onClick={() => setMobileMenuOpen(false)} />
                  <MobileNavLink href="/pay-rates" label="Pay Rates" onClick={() => setMobileMenuOpen(false)} />
                  <MobileNavLink href="/routes" label="Routes" onClick={() => setMobileMenuOpen(false)} />
                  <MobileNavLink href="/testimonials" label="Success Stories" onClick={() => setMobileMenuOpen(false)} />
                  <MobileNavLink href="/driver-portal" label="Driver Portal" onClick={() => setMobileMenuOpen(false)} />
                  <MobileNavLink href="/pre-qualify" label="Pre-Qualify" onClick={() => setMobileMenuOpen(false)} />
                  <MobileNavLink href="/apply" label="Apply Now" primary onClick={() => setMobileMenuOpen(false)} />
               </nav>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}

function MobileNavLink({ href, label, primary = false, onClick }: { href: string, label: string, primary?: boolean, onClick: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`
        block px-4 py-3 rounded-xl text-lg font-medium transition-colors
        ${primary 
          ? 'bg-[#001F3F] text-white text-center font-bold' 
          : 'text-gray-600 hover:bg-gray-50 hover:text-[#001F3F]'
        }
      `}
    >
      {label}
    </Link>
  )
}
