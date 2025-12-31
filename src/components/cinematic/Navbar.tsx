"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { 
  ChevronDown, 
  Menu, 
  X, 
  Phone, 
  FileText, 
  DollarSign, 
  Heart,
  MapPin,
  MessageSquare,
  BookOpen,
  Users,
  Truck,
  Image as ImageIcon,
  Shield,
  ChevronRight
} from "lucide-react"

// Navigation items with dropdowns
const driverMenuItems = [
  { href: "/apply", label: "Apply Now", description: "Start your application", icon: FileText, highlight: true },
  { href: "/pay-rates", label: "Pay Rates", description: "91% O/O split", icon: DollarSign },
  { href: "/benefits", label: "Benefits", description: "Full package", icon: Heart },
  { href: "/routes", label: "Routes", description: "Nationwide lanes", icon: MapPin },
  { href: "/testimonials", label: "Testimonials", description: "Driver reviews", icon: MessageSquare },
  { href: "/resources", label: "Resources", description: "Driver tools", icon: BookOpen },
]

const companyMenuItems = [
  { href: "/about", label: "About Us", description: "Family-owned since 2016", icon: Users },
  { href: "/fleet", label: "Our Fleet", description: "2024 Cascadias", icon: Truck },
  { href: "/showcase", label: "Showcase", description: "Gallery", icon: ImageIcon },
  { href: "/veterans", label: "Veterans", description: "We honor service", icon: Shield },
]

// Dropdown component for desktop
function DesktopDropdown({ 
  label, 
  items, 
  isOpen, 
  onToggle,
  onClose 
}: { 
  label: string
  items: typeof driverMenuItems
  isOpen: boolean
  onToggle: () => void
  onClose: () => void
}) {
  const dropdownRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  
  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isOpen, onClose])

  // Check if any item in this menu is active
  const hasActiveItem = items.some(item => pathname === item.href || pathname.startsWith(item.href + '/'))

  return (
    <div ref={dropdownRef} className="relative">
      <button 
        onClick={onToggle}
        className={`flex items-center gap-1 px-3 py-2 text-sm font-medium transition-all rounded-lg
          ${hasActiveItem 
            ? 'text-white bg-white/10' 
            : 'text-white/80 hover:text-white hover:bg-white/5'
          }
        `}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {label}
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute top-full left-0 mt-2 w-64 py-2 bg-[#001F3F]/95 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl overflow-hidden"
          >
            {items.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-4 py-3 transition-all group
                    ${item.highlight 
                      ? 'bg-orange-500/10 hover:bg-orange-500/20 border-l-2 border-orange-500' 
                      : isActive
                        ? 'bg-white/10 border-l-2 border-white'
                        : 'hover:bg-white/5 border-l-2 border-transparent hover:border-white/30'
                    }
                  `}
                >
                  <div className={`p-2 rounded-lg transition-colors
                    ${item.highlight 
                      ? 'bg-orange-500/20 text-orange-400' 
                      : isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-white/10 text-white/80 group-hover:bg-white/15 group-hover:text-white'
                    }
                  `}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className={`text-sm font-medium ${item.highlight ? 'text-orange-400' : isActive ? 'text-white' : 'text-white/90'}`}>
                      {item.label}
                    </div>
                    <div className="text-xs text-white/70">{item.description}</div>
                  </div>
                  {item.highlight && (
                    <ChevronRight className="w-4 h-4 text-orange-400 group-hover:translate-x-1 transition-transform" />
                  )}
                </Link>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Mobile Menu Drawer
function MobileMenuDrawer({ 
  isOpen, 
  onClose 
}: { 
  isOpen: boolean
  onClose: () => void 
}) {
  const pathname = usePathname()
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[101]"
            onClick={onClose}
          />
          
          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 bottom-0 w-[85vw] max-w-sm bg-[#001F3F] z-[102] flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <Link href="/" onClick={onClose} className="text-xl font-bold text-white tracking-tighter">
                THIND TRANSPORT
              </Link>
              <button
                onClick={onClose}
                className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Navigation */}
            <div className="flex-1 overflow-y-auto py-4">
              {/* Drivers Section */}
              <div className="px-4 mb-2">
                <button
                  onClick={() => setExpandedSection(expandedSection === 'drivers' ? null : 'drivers')}
                  className="w-full flex items-center justify-between py-3 text-white/80 text-xs uppercase tracking-widest font-semibold"
                >
                  For Drivers
                  <ChevronDown className={`w-4 h-4 transition-transform ${expandedSection === 'drivers' ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {expandedSection === 'drivers' && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      {driverMenuItems.map((item) => {
                        const Icon = item.icon
                        const isActive = pathname === item.href
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={onClose}
                            className={`flex items-center gap-3 py-3 px-2 rounded-xl transition-all
                              ${item.highlight 
                                ? 'bg-gradient-to-r from-orange-500/20 to-orange-600/10 border border-orange-500/30' 
                                : isActive
                                  ? 'bg-white/10'
                                  : 'hover:bg-white/5'
                              }
                            `}
                          >
                            <div className={`p-2.5 rounded-xl
                              ${item.highlight 
                                ? 'bg-orange-500 text-white' 
                                : isActive
                                  ? 'bg-white/20 text-white'
                                  : 'bg-white/5 text-white/60'
                              }
                            `}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                              <div className={`font-medium ${item.highlight ? 'text-orange-400' : isActive ? 'text-white' : 'text-white/90'}`}>
                                {item.label}
                              </div>
                              <div className="text-xs text-white/70">{item.description}</div>
                            </div>
                            {item.highlight && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500 text-white font-bold uppercase">
                                Start
                              </span>
                            )}
                          </Link>
                        )
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Company Section */}
              <div className="px-4 mb-2">
                <button
                  onClick={() => setExpandedSection(expandedSection === 'company' ? null : 'company')}
                  className="w-full flex items-center justify-between py-3 text-white/80 text-xs uppercase tracking-widest font-semibold"
                >
                  Company
                  <ChevronDown className={`w-4 h-4 transition-transform ${expandedSection === 'company' ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {expandedSection === 'company' && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      {companyMenuItems.map((item) => {
                        const Icon = item.icon
                        const isActive = pathname === item.href
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={onClose}
                            className={`flex items-center gap-3 py-3 px-2 rounded-xl transition-all
                              ${isActive ? 'bg-white/10' : 'hover:bg-white/5'}
                            `}
                          >
                            <div className={`p-2.5 rounded-xl ${isActive ? 'bg-white/20 text-white' : 'bg-white/10 text-white/80'}`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                              <div className={`font-medium ${isActive ? 'text-white' : 'text-white/90'}`}>{item.label}</div>
                              <div className="text-xs text-white/70">{item.description}</div>
                            </div>
                          </Link>
                        )
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Quick Links */}
              <div className="px-4 pt-4 border-t border-white/10 mt-4">
                <Link
                  href="/driver/login"
                  onClick={onClose}
                  className={`flex items-center gap-3 py-3 px-2 rounded-xl transition-all
                    ${pathname === '/driver/login' ? 'bg-white/10' : 'hover:bg-white/5'}
                  `}
                >
                  <div className={`p-2.5 rounded-xl ${pathname === '/driver/login' ? 'bg-white/20 text-white' : 'bg-white/10 text-white/80'}`}>
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className={`font-medium ${pathname === '/driver/login' ? 'text-white' : 'text-white/90'}`}>Driver Login</div>
                    <div className="text-xs text-white/70">Access your application</div>
                  </div>
                </Link>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-white/10 space-y-3 bg-[#001326]">
              <a
                href="tel:+12067656300"
                className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-white/5 hover:bg-white/10 rounded-xl text-white font-medium transition-colors"
              >
                <Phone className="w-4 h-4" />
                (206) 765-6300
              </a>
              <Link
                href="/apply"
                onClick={onClose}
                className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 rounded-xl text-white font-bold transition-all shadow-lg shadow-orange-500/25"
              >
                Apply Now
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export const CinematicNavbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [scrolled, setScrolled] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [lastScrollY, setLastScrollY] = useState(0)
  const pathname = usePathname()

  // Handle scroll for enhanced visibility + hide on scroll down (mobile)
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      
      // Update scrolled state for styling
      setScrolled(currentScrollY > 50)
      
      // Hide on scroll down, show on scroll up (mobile only)
      if (currentScrollY > 100) {
        if (currentScrollY > lastScrollY && currentScrollY - lastScrollY > 10) {
          // Scrolling down - hide on mobile
          setHidden(true)
        } else if (lastScrollY > currentScrollY && lastScrollY - currentScrollY > 10) {
          // Scrolling up - show
          setHidden(false)
        }
      } else {
        setHidden(false)
      }
      
      setLastScrollY(currentScrollY)
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [lastScrollY])

  // Close dropdowns on route change
  useEffect(() => {
    setActiveDropdown(null)
    setMobileMenuOpen(false)
  }, [pathname])

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ${
        scrolled ? 'pt-2' : 'pt-4'
      } ${hidden ? 'md:translate-y-0 -translate-y-full' : 'translate-y-0'}`}>
        <div className="flex justify-center pointer-events-none px-4 w-full">
          <nav className={`pointer-events-auto flex items-center justify-between md:justify-start w-auto max-w-[98%] gap-3 md:gap-6 pl-4 pr-1.5 py-1.5 md:px-6 md:py-3 rounded-full transition-all duration-300 active:scale-[0.98] md:active:scale-100 ${
            scrolled 
              ? 'bg-[#001F3F]/95 backdrop-blur-xl shadow-2xl shadow-black/20 border border-white/10' 
              : 'bg-black/40 backdrop-blur-md border border-white/10 shadow-lg'
          }`}>
            {/* Logo */}
            <Link 
              href="/" 
              className="relative z-20 text-lg md:text-xl font-bold text-white tracking-tighter hover:text-orange-400 transition-colors whitespace-nowrap leading-none flex items-center" 
              data-cursor="HOME"
            >
              <span className="md:hidden tracking-wide">THIND TRANSPORT</span>
              <span className="hidden md:inline">THIND TRANSPORT</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              <DesktopDropdown
                label="Drivers"
                items={driverMenuItems}
                isOpen={activeDropdown === 'drivers'}
                onToggle={() => setActiveDropdown(activeDropdown === 'drivers' ? null : 'drivers')}
                onClose={() => setActiveDropdown(null)}
              />
              
              <DesktopDropdown
                label="Company"
                items={companyMenuItems}
                isOpen={activeDropdown === 'company'}
                onToggle={() => setActiveDropdown(activeDropdown === 'company' ? null : 'company')}
                onClose={() => setActiveDropdown(null)}
              />

              <Link 
                href="/driver/login" 
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-all
                  ${pathname === '/driver/login' || pathname.startsWith('/driver/')
                    ? 'text-white bg-white/10'
                    : 'text-white/80 hover:text-white hover:bg-white/5'
                  }
                `}
                data-cursor="VIEW"
              >
                Portal
              </Link>
            </div>

            {/* Phone Number - Desktop only */}
            <a 
              href="tel:+12067656300" 
              className="hidden lg:flex items-center gap-2 px-3 py-2 text-sm font-medium text-white/80 hover:text-white transition-colors"
              data-cursor="CALL"
            >
              <Phone className="w-4 h-4" />
              <span className="hidden xl:inline">(206) 765-6300</span>
            </a>
            
            {/* Apply Button */}
            <Link 
              href="/apply" 
              className="hidden sm:flex px-4 md:px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-full text-xs uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-lg shadow-orange-500/25" 
              data-cursor="APPLY"
            >
              Apply Now
            </Link>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center justify-center"
              aria-label="Open navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              <Menu className="w-5 h-5" />
            </button>
          </nav>
        </div>
      </header>

      {/* Mobile Menu Drawer */}
      <MobileMenuDrawer 
        isOpen={mobileMenuOpen} 
        onClose={() => setMobileMenuOpen(false)} 
      />
    </>
  )
}
