"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import Script from "next/script"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"
import { 
  MapPin, Navigation, Truck, Home, Clock, 
  DollarSign, CheckCircle2, ChevronRight,
  Shield, Calendar, Package, Route,
  Mountain, Waves, Sun, TrendingUp, Users,
  ArrowRight, Compass, Star, Target, Phone,
  ThumbsUp, Thermometer, ChevronDown,
  HelpCircle, ExternalLink
} from "lucide-react"
import { COMPANY_INFO, TRUST_INDICATORS, PAY_RATES } from "@/lib/constants"
import { RouteMapVisualization } from "@/components/features/RouteMapVisualization"
import { PageBreadcrumb } from "@/components/shared/PageBreadcrumb"
import { MARKET_DATA } from "@/lib/market-data"

// JSON-LD Structured Data for SEO
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  "name": "CDL Trucking Routes - Thind Transport LLC",
  "description": "High-paying CDL-A trucking routes from Seattle, WA. Local, Regional, and OTR freight lanes across 48 states.",
  "provider": {
    "@type": "Organization",
    "name": "Thind Transport LLC",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Kent",
      "addressRegion": "WA",
      "postalCode": "98064",
      "addressCountry": "US"
    },
    "telephone": "+12067656300"
  },
  "areaServed": {
    "@type": "Country",
    "name": "United States"
  },
  "serviceType": ["Trucking", "Freight Transportation", "CDL Driver Jobs"],
  "offers": [
    {
      "@type": "Offer",
      "name": "Local Routes",
      "description": "Home daily trucking routes in WA and OR",
      "priceSpecification": {
        "@type": "PriceSpecification",
        "price": "55000-70000",
        "priceCurrency": "USD",
        "unitText": "YEAR"
      }
    },
    {
      "@type": "Offer", 
      "name": "Regional Routes",
      "description": "Home weekly trucking routes across Western US",
      "priceSpecification": {
        "@type": "PriceSpecification",
        "price": "65000-80000",
        "priceCurrency": "USD",
        "unitText": "YEAR"
      }
    },
    {
      "@type": "Offer",
      "name": "OTR Routes",
      "description": "Over the road trucking routes across 48 states",
      "priceSpecification": {
        "@type": "PriceSpecification",
        "price": "70000-90000",
        "priceCurrency": "USD",
        "unitText": "YEAR"
      }
    }
  ]
}

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What are the highest paying trucking routes from Seattle?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": `Our highest paying routes from Seattle are the I-5 Corridor to Los Angeles ($${MARKET_DATA.hotLanes.find(l => l.id === 'sea-la')?.rate}/mi), the cross-country route to Chicago ($${MARKET_DATA.hotLanes.find(l => l.id === 'sea-chi')?.rate}/mi), and Seattle to Denver ($${MARKET_DATA.hotLanes.find(l => l.id === 'kent-den')?.rate}/mi). These lanes have consistent freight and competitive rates year-round.`
      }
    },
    {
      "@type": "Question",
      "name": "How often can I be home as a truck driver?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "We offer flexible home time options: Local routes provide daily home time, Regional routes offer weekly home time, and OTR routes have home time every 2-3 weeks. You choose what fits your lifestyle."
      }
    },
    {
      "@type": "Question",
      "name": "What freight types do you haul on your routes?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "We haul Dry Van, Reefer (refrigerated), and Flatbed freight. Our lanes serve retail, e-commerce, food & beverage, construction, and manufacturing industries across 48 states."
      }
    },
    {
      "@type": "Question",
      "name": "Do you provide dedicated routes?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes, we offer dedicated lanes on our most popular corridors including I-5, I-90, and I-84. Dedicated routes mean consistent freight, familiar roads, and predictable schedules."
      }
    },
    {
      "@type": "Question",
      "name": "What are the requirements to drive these routes?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "For OTR routes: CDL-A with 2+ years experience. For Local/Regional: CDL-A with 1+ year experience. Clean MVR and ability to pass DOT physical and drug screening required."
      }
    }
  ]
}

// Brand Colors from Master Spec
const BRAND = {
  navy: "#001F3F",
  orange: "#FF9500",
  green: "#228B22",
  lightGray: "#F3F4F6",
  white: "#FFFFFF",
}

// Enhanced Hot Lanes data from centralized market data
const hotLanes = MARKET_DATA.hotLanes.map(lane => ({
  ...lane,
  rate: `$${lane.rate.toFixed(2)}/mi`,
  miles: lane.distance.toLocaleString(),
  hot: lane.status === 'hot',
  eta: lane.transitTime
}))

// Route type definitions with enhanced data
interface RouteType {
  id: string
  name: string
  shortName: string
  type: "local" | "regional" | "otr"
  truckType: string
  states: string[]
  averageMiles: string
  homeTime: string
  payRange: string
  perMile: string
  topLane: { route: string; rate: string }
  spotsLeft: number | null
  isRecommended: boolean
  description: string
  icon: React.ReactNode
  industries: string[]
  freightTypes: string[]
  transitTime: string
}

// Enhanced corridor data
interface Corridor {
  name: string
  route: string
  from: string
  to: string
  miles: string
  frequency: string
  icon: React.ReactNode
  transitTime: string
  industries: string[]
  highlights: string[]
  avgRate: string
}

// Driver testimonials for routes
const routeTestimonials = [
  {
    name: "Marcus J.",
    role: "Regional Driver",
    years: "3 years",
    route: "I-5 Corridor",
    quote: "The I-5 runs are consistent and pay well. I'm home every weekend and still averaging $1,500/week.",
    rating: 5,
    image: "/resources/driver-portrait-1.jpg"
  },
  {
    name: "Sarah T.",
    role: "OTR Driver",
    years: "5 years",
    route: "Cross-Country",
    quote: "Best rates I've seen for coast-to-coast loads. Dispatch always finds me backhauls so I never deadhead.",
    rating: 5,
    image: "/resources/driver-portrait-2.jpg"
  },
  {
    name: "Robert K.",
    role: "Local Driver",
    years: "2 years",
    route: "Seattle Metro",
    quote: "Home every night to see my kids. The local routes are perfect for work-life balance.",
    rating: 5,
    image: "/resources/driver-portrait-3.jpg"
  },
]

// FAQ data for SEO
const routeFAQs = [
  {
    question: "What are the highest paying trucking routes from Seattle?",
    answer: `Our highest paying routes from Seattle are the I-5 Corridor to Los Angeles ($${MARKET_DATA.hotLanes.find(l => l.id === 'sea-la')?.rate}/mi), the cross-country route to Chicago ($${MARKET_DATA.hotLanes.find(l => l.id === 'sea-chi')?.rate}/mi), and Seattle to Denver ($${MARKET_DATA.hotLanes.find(l => l.id === 'kent-den')?.rate}/mi). These lanes have consistent freight and competitive rates year-round.`
  },
  {
    question: "How often can I be home as a truck driver?",
    answer: "We offer flexible home time options: Local routes provide daily home time, Regional routes offer weekly home time, and OTR routes have home time every 2-3 weeks. You choose what fits your lifestyle."
  },
  {
    question: "What freight types do you haul on your routes?",
    answer: "We haul Dry Van, Reefer (refrigerated), and Flatbed freight. Our lanes serve retail, e-commerce, food & beverage, construction, and manufacturing industries across 48 states."
  },
  {
    question: "Do you provide dedicated routes?",
    answer: "Yes, we offer dedicated lanes on our most popular corridors including I-5, I-90, and I-84. Dedicated routes mean consistent freight, familiar roads, and predictable schedules."
  },
  {
    question: "What are the requirements to drive these routes?",
    answer: "For OTR routes: CDL-A with 2+ years experience. For Local/Regional: CDL-A with 1+ year experience. Clean MVR and ability to pass DOT physical and drug screening required."
  },
]

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const }
  }
}

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.6 }
  }
}

export default function RoutesPage() {
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null)
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null)

  const routes: RouteType[] = [
    {
      id: "local",
      name: "Local Routes",
      shortName: "LOCAL",
      type: "local",
      truckType: "Day Cab",
      states: ["WA", "OR"],
      averageMiles: "150-250/day",
      homeTime: "Home Daily",
      payRange: "$50K-$65K",
      perMile: "$0.50-$0.55/mi",
      topLane: { route: "Seattle Metro Loop", rate: "$1.85/mi" },
      spotsLeft: 2,
      isRecommended: false,
      description: "Home every night. Perfect for drivers who value family time. Operate within 150-mile radius of Kent, WA serving the Pacific Northwest's major metropolitan areas.",
      icon: <Home className="h-7 w-7" />,
      industries: ["Retail", "E-commerce", "Manufacturing"],
      freightTypes: ["Dry Van", "Reefer"],
      transitTime: "Same-day delivery"
    },
    {
      id: "regional",
      name: "Regional Routes",
      shortName: "REGIONAL",
      type: "regional",
      truckType: "Sleeper Cab",
      states: ["WA", "OR", "CA", "ID", "MT", "UT", "NV", "AZ"],
      averageMiles: "400-600/day",
      homeTime: "Home Weekly",
      payRange: "$55K-$72K",
      perMile: "$0.52-$0.58/mi",
      topLane: { route: "Seattle ↔ LA", rate: `$${MARKET_DATA.hotLanes.find(l => l.id === 'sea-la')?.rate}/mi` },
      spotsLeft: 5,
      isRecommended: false,
      description: "Best balance of miles and home time. Cover the Western US with consistent lanes, familiar routes, and premium rates on high-volume corridors.",
      icon: <Compass className="h-7 w-7" />,
      industries: ["Retail", "Food & Beverage", "Construction", "Agriculture"],
      freightTypes: ["Dry Van", "Reefer", "Flatbed"],
      transitTime: "1-3 day delivery"
    },
    {
      id: "otr",
      name: "OTR (Over the Road)",
      shortName: "OTR",
      type: "otr",
      truckType: "Full Sleeper",
      states: ["All 48 States"],
      averageMiles: "500-700/day",
      homeTime: "Every 2-3 Weeks",
      payRange: "$65K-$78K",
      perMile: "$0.55-$0.60/mi",
      topLane: { route: "Coast to Coast", rate: `$${MARKET_DATA.rates.dryVan.max}/mi` },
      spotsLeft: null,
      isRecommended: true,
      description: "Maximum earning potential. See the country while earning top dollar. Premium long-haul rates on coast-to-coast lanes with consistent backhauls.",
      icon: <Truck className="h-7 w-7" />,
      industries: ["All Industries", "E-commerce", "Manufacturing", "Retail"],
      freightTypes: ["Dry Van", "Reefer", "Flatbed"],
      transitTime: "Cross-country in 4-5 days"
    }
  ]

  const corridors: Corridor[] = [
    { 
      name: "I-5 Corridor", 
      route: "Seattle ↔ Los Angeles", 
      from: "Seattle, WA",
      to: "Los Angeles, CA",
      miles: "1,137", 
      frequency: "Daily", 
      icon: <Waves className="h-5 w-5" />,
      transitTime: "18-20 hours",
      industries: ["Retail", "E-commerce", "Food & Beverage"],
      highlights: ["High volume lane", "Consistent backhauls", "Port freight available"],
      avgRate: `$${MARKET_DATA.hotLanes.find(l => l.id === 'sea-la')?.rate}/mi`
    },
    { 
      name: "I-90 Transcontinental", 
      route: "Seattle ↔ Chicago", 
      from: "Seattle, WA",
      to: "Chicago, IL",
      miles: "2,064", 
      frequency: "3x/week", 
      icon: <Route className="h-5 w-5" />,
      transitTime: "30-32 hours",
      industries: ["Manufacturing", "Retail", "Automotive"],
      highlights: ["Premium long-haul rates", "Multiple drop opportunities", "Midwest freight hub"],
      avgRate: `$${MARKET_DATA.hotLanes.find(l => l.id === 'sea-chi')?.rate}/mi`
    },
    { 
      name: "I-84 Mountain Route", 
      route: "Portland ↔ Salt Lake City", 
      from: "Portland, OR",
      to: "Salt Lake City, UT",
      miles: "856", 
      frequency: "Daily", 
      icon: <Mountain className="h-5 w-5" />,
      transitTime: "13-14 hours",
      industries: ["Construction", "Agriculture", "Mining"],
      highlights: ["Mountain premium pay", "Scenic route", "Growing freight market"],
      avgRate: `$${MARKET_DATA.hotLanes.find(l => l.id === 'tac-slc')?.rate || 2.25}/mi`
    },
    { 
      name: "I-10 Southern Route", 
      route: "Phoenix ↔ Los Angeles", 
      from: "Phoenix, AZ",
      to: "Los Angeles, CA",
      miles: "358", 
      frequency: "Daily", 
      icon: <Sun className="h-5 w-5" />,
      transitTime: "5-6 hours",
      industries: ["E-commerce", "Manufacturing", "Retail"],
      highlights: ["Year-round mild weather", "Quick turnaround", "High frequency"],
      avgRate: "$2.10/mi"
    },
    { 
      name: "I-80 Cross-Country", 
      route: "San Francisco ↔ New York", 
      from: "San Francisco, CA",
      to: "New York, NY",
      miles: "2,906", 
      frequency: "Weekly", 
      icon: <Navigation className="h-5 w-5" />,
      transitTime: "42-48 hours",
      industries: ["Technology", "Retail", "Manufacturing"],
      highlights: ["Highest earning potential", "Coast-to-coast experience", "Multiple fuel stops"],
      avgRate: `$${MARKET_DATA.rates.dryVan.spot}/mi`
    },
  ]

  const lanesData = MARKET_DATA.hotLanes.map((lane, index) => ({
    rank: index + 1,
    from: lane.from,
    to: lane.to,
    miles: lane.distance.toLocaleString(),
    rate: `$${lane.rate.toFixed(2)}/mi`,
    status: lane.status,
    transitTime: lane.transitTime
  }))


  return (
    <>
      {/* JSON-LD Structured Data for SEO */}
      <Script
        id="routes-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Script
        id="faq-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      
      <div className="min-h-screen bg-[#F3F4F6]">
        <PageBreadcrumb pageName="Routes & Lanes" category="Drivers" />

      {/* Hero Section - Deep Navy Background */}
      <div className="relative overflow-hidden text-white pt-8 pb-24" style={{ backgroundColor: BRAND.navy }}>
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `
              linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px'
          }} />
        </div>
        
        {/* Decorative route lines */}
        <div className="absolute inset-0 overflow-hidden opacity-20">
          <svg className="absolute w-full h-full" viewBox="0 0 1200 400" preserveAspectRatio="none">
            <path d="M0,200 Q300,100 600,200 T1200,200" stroke={BRAND.orange} strokeWidth="2" fill="none" strokeDasharray="8,8" />
            <path d="M0,250 Q400,150 800,250 T1200,180" stroke={BRAND.green} strokeWidth="2" fill="none" strokeDasharray="8,8" />
          </svg>
        </div>
        
        <div className="container relative z-10">
          <motion.div className="text-center mb-8" initial="hidden" animate="visible" variants={fadeInUp}>
            <Badge className="mb-4 px-4 py-2 text-sm font-bold border-0 !bg-orange-500/25 text-orange-600">
              <Target className="h-4 w-4 mr-1.5" />
              CDL-A TRUCKING ROUTES
            </Badge>
            <h1 className="text-4xl md:text-6xl font-black mb-4 leading-tight tracking-tight">
              Find Your <span style={{ color: BRAND.orange }}>Perfect Lane</span>
            </h1>
            <p className="text-lg text-white/90 max-w-3xl mx-auto font-medium mb-6">
              Transparent rates from ${PAY_RATES.companyDriver.local.perMile}. Consistent freight across 48 states. 
              Choose local, regional, or OTR routes that fit your lifestyle.
            </p>
            
            {/* Quick Stats */}
            <div className="flex flex-wrap justify-center gap-6 mb-8">
              {[
                { label: "Avg Rate", value: `$${MARKET_DATA.rates.dryVan.spot}/mi`, icon: <DollarSign className="h-4 w-4" /> },
                { label: "States Covered", value: "48", icon: <MapPin className="h-4 w-4" /> },
                { label: "Active Lanes", value: "50+", icon: <Route className="h-4 w-4" /> },
                { label: "Daily Dispatches", value: "100+", icon: <Truck className="h-4 w-4" /> },
              ].map((stat, i) => (
                <div key={i} className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/10">
                  <span className="text-white">{stat.icon}</span>
                  <span className="text-white font-bold">{stat.value}</span>
                  <span className="text-white/90 text-sm">{stat.label}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Hot Lanes Ticker */}
          <motion.div 
            className="relative overflow-hidden rounded-xl py-3 border"
            style={{ backgroundColor: `${BRAND.navy}dd`, borderColor: 'rgba(255,255,255,0.1)' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center">
              <div className="flex-shrink-0 px-4 border-r border-white/10 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: BRAND.orange }} />
                <span className="font-bold text-sm uppercase tracking-wider" style={{ color: BRAND.orange }}>Live Rates</span>
              </div>
              <div className="overflow-hidden flex-1">
                <div className="flex items-center gap-8 whitespace-nowrap" style={{ animation: 'marquee 40s linear infinite' }}>
                  {[...hotLanes, ...hotLanes].map((lane, index) => (
                    <div key={index} className="flex items-center gap-3 px-4">
                      <span className="text-white text-sm font-medium">{lane.from}</span>
                      <ArrowRight className="h-3 w-3 text-white/90" />
                      <span className="text-white text-sm font-medium">{lane.to}</span>
                      <span className="font-bold text-sm text-emerald-400">{lane.rate}</span>
                                <span className="text-white/90 text-xs">({lane.miles} mi)</span>
                      {lane.hot && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-orange-500 text-white">
                          HOT
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>


      {/* Route Cards Section */}
      <div className="py-16" style={{ backgroundColor: BRAND.lightGray }}>
        <div className="container">
          <motion.div 
            className="grid md:grid-cols-3 gap-6"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
          >
            {routes.map((route) => (
              <motion.div key={route.id} variants={cardVariants}>
                <Card 
                  className={`relative overflow-hidden transition-all duration-300 cursor-pointer bg-white h-full ${
                    route.isRecommended 
                      ? 'ring-2 shadow-xl scale-[1.02] md:scale-105' 
                      : 'border-gray-200 hover:shadow-lg hover:-translate-y-1'
                  } ${selectedRoute === route.id ? 'ring-2' : ''}`}
                  style={{ 
                    borderColor: route.isRecommended ? BRAND.orange : undefined,
                    ['--tw-ring-color' as string]: route.isRecommended ? BRAND.orange : BRAND.navy
                  }}
                  onClick={() => setSelectedRoute(route.id)}
                >
                  {/* Recommended Badge */}
                  {route.isRecommended && (
                    <div className="absolute top-0 right-0">
                      <div className="text-white text-xs font-black px-4 py-1.5 rounded-bl-lg flex items-center gap-1" style={{ backgroundColor: BRAND.orange }}>
                        <Star className="h-3 w-3" />
                        HIGHEST EARNING
                      </div>
                    </div>
                  )}

                  {/* Spots Left Badge */}
                  {route.spotsLeft && (
                    <div className="absolute top-4 left-4">
                      <Badge className="bg-red-50 text-red-700 border-red-200 text-xs font-bold animate-pulse">
                        <Users className="h-3 w-3 mr-1" />
                        Only {route.spotsLeft} spots left
                      </Badge>
                    </div>
                  )}

                  <div className={`p-6 ${route.isRecommended ? 'pt-12' : route.spotsLeft ? 'pt-14' : ''}`}>
                    {/* Route Type Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 rounded-xl" style={{ backgroundColor: `${BRAND.navy}15`, color: BRAND.navy }}>
                        {route.icon}
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-600 uppercase tracking-wider font-medium">Truck Type</div>
                        <div className="text-sm font-bold" style={{ color: BRAND.navy }}>{route.truckType}</div>
                      </div>
                    </div>

                    <h2 className="text-2xl font-black mb-2" style={{ color: BRAND.navy }}>{route.name}</h2>
                    <p className="text-gray-600 text-sm mb-4 leading-relaxed">{route.description}</p>

                    {/* Freight Types */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {route.freightTypes.map((type, i) => (
                        <Badge key={i} variant="outline" className="!bg-gray-100 border-gray-300 text-xs font-semibold" style={{ color: '#111827' }}>
                          {type === "Reefer" && <Thermometer className="h-3 w-3 mr-1" style={{ color: '#374151' }} />}
                          {type === "Dry Van" && <Package className="h-3 w-3 mr-1" style={{ color: '#374151' }} />}
                          {type === "Flatbed" && <Truck className="h-3 w-3 mr-1" style={{ color: '#374151' }} />}
                          {type}
                        </Badge>
                      ))}
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-gray-600 text-xs mb-1 font-medium">
                          <DollarSign className="h-3 w-3" />
                          Annual Pay
                        </div>
                        <div className="font-bold text-lg" style={{ color: BRAND.green }}>{route.payRange}</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-gray-600 text-xs mb-1 font-medium">
                          <Home className="h-3 w-3" />
                          Home Time
                        </div>
                        <div className="font-bold text-sm" style={{ color: BRAND.navy }}>{route.homeTime}</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-gray-600 text-xs mb-1 font-medium">
                          <Navigation className="h-3 w-3" />
                          Avg Miles
                        </div>
                        <div className="font-bold text-sm" style={{ color: BRAND.navy }}>{route.averageMiles}</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-gray-600 text-xs mb-1 font-medium">
                          <Clock className="h-3 w-3" />
                          Transit
                        </div>
                        <div className="font-bold text-sm" style={{ color: BRAND.navy }}>{route.transitTime}</div>
                      </div>
                    </div>

                    {/* Industries Served */}
                    <div className="text-xs text-gray-600 mb-4">
                      <span className="font-semibold text-gray-700">Industries:</span> {route.industries.join(", ")}
                    </div>

                    {/* Top Lane Highlight */}
                    <div className="rounded-lg p-3 mb-4 border" style={{ backgroundColor: `${BRAND.green}08`, borderColor: `${BRAND.green}20` }}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: BRAND.green }}>Top Paying Lane</div>
                          <div className="font-medium" style={{ color: BRAND.navy }}>{route.topLane.route}</div>
                        </div>
                        <div className="font-black text-xl" style={{ color: BRAND.green }}>{route.topLane.rate}</div>
                      </div>
                    </div>

                    {/* CTA Button */}
                    <Button 
                      className="w-full font-bold text-base transition-all hover:scale-[1.02] !bg-orange-500 !from-orange-500 !to-orange-600 text-navy hover:!bg-orange-600"
                      size="lg"
                      asChild
                    >
                      <Link href="/apply" className="text-[#001F3F]">
                        Check Lane Availability
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Link>
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Driver Testimonials Section */}
      <div className="py-16 bg-white">
        <div className="container">
          <motion.div className="text-center mb-10" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}>
            <Badge className="mb-4 px-4 py-2 text-xs font-bold border-0 !bg-green-600/25 text-green-700">
              <ThumbsUp className="h-4 w-4 mr-1.5" />
              DRIVER TESTIMONIALS
            </Badge>
            <h2 className="text-3xl md:text-4xl font-black mb-3" style={{ color: BRAND.navy }}>
              What Our Drivers Say About These Routes
            </h2>
            <p className="text-gray-600 max-w-xl mx-auto">
              Real feedback from drivers running these lanes every day.
            </p>
          </motion.div>

          <motion.div 
            className="grid md:grid-cols-3 gap-6"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {routeTestimonials.map((testimonial, index) => (
              <motion.div key={index} variants={cardVariants}>
                <Card className="bg-gray-50 border-gray-200 p-6 h-full">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                      <span className="text-lg font-bold text-gray-700">{testimonial.name.charAt(0)}</span>
                    </div>
                    <div>
                      <div className="font-bold" style={{ color: BRAND.navy }}>{testimonial.name}</div>
                      <div className="text-sm text-gray-600 font-medium">{testimonial.role} • {testimonial.years}</div>
                    </div>
                  </div>
                  <Badge variant="outline" className="mb-3 !bg-white border-gray-300 text-xs font-semibold" style={{ color: '#111827' }}>
                    <Route className="h-3 w-3 mr-1" style={{ color: '#374151' }} />
                    {testimonial.route}
                  </Badge>
                  <p className="text-gray-700 italic mb-4">&ldquo;{testimonial.quote}&rdquo;</p>
                  <div className="flex gap-1">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Major Corridors Section - Enhanced */}
      <div className="py-16" style={{ backgroundColor: BRAND.lightGray }}>
        <div className="container">
          <motion.div className="text-center mb-10" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}>
            <Badge className="mb-4 px-4 py-2 text-xs font-bold border-0 !bg-[#001F3F] text-white">
              <Route className="h-4 w-4 mr-1.5" />
              MAJOR FREIGHT CORRIDORS
            </Badge>
            <h2 className="text-3xl md:text-4xl font-black mb-3" style={{ color: BRAND.navy }}>
              Our Most Popular Lanes
            </h2>
            <p className="text-gray-600 max-w-xl mx-auto">
              Consistent freight on America&apos;s busiest corridors. We have the volume to keep you moving.
            </p>
          </motion.div>

          <motion.div 
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {corridors.map((corridor, index) => (
              <motion.div key={index} variants={cardVariants}>
                <Card className="bg-white border-gray-200 p-6 hover:shadow-lg transition-all h-full">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-2 rounded-lg" style={{ backgroundColor: `${BRAND.navy}15`, color: BRAND.navy }}>
                      {corridor.icon}
                    </div>
                    <div className="text-right">
                      <div className="font-black text-xl" style={{ color: BRAND.green }}>{corridor.avgRate}</div>
                      <div className="text-xs text-gray-600 font-medium">avg rate</div>
                    </div>
                  </div>
                  
                  <h3 className="font-bold text-lg mb-1" style={{ color: BRAND.navy }}>{corridor.name}</h3>
                  <p className="text-gray-600 text-sm mb-3">{corridor.route}</p>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant="outline" className="!bg-gray-100 border-gray-300 text-xs font-semibold" style={{ color: '#111827' }}>
                      <Navigation className="h-3 w-3 mr-1" style={{ color: '#374151' }} />
                      {corridor.miles} mi
                    </Badge>
                    <Badge variant="outline" className="!bg-gray-100 border-gray-300 text-xs font-semibold" style={{ color: '#111827' }}>
                      <Clock className="h-3 w-3 mr-1" style={{ color: '#374151' }} />
                      {corridor.transitTime}
                    </Badge>
                    <Badge variant="outline" className="!bg-gray-100 border-gray-300 text-xs font-semibold" style={{ color: '#111827' }}>
                      <Calendar className="h-3 w-3 mr-1" style={{ color: '#374151' }} />
                      {corridor.frequency}
                    </Badge>
                  </div>

                  <div className="text-xs text-gray-600 mb-3">
                    <span className="font-semibold text-gray-700">Key Industries:</span> {corridor.industries.join(", ")}
                  </div>

                  <ul className="space-y-1">
                    {corridor.highlights.map((highlight, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                        <CheckCircle2 className="h-3 w-3" style={{ color: BRAND.green }} />
                        {highlight}
                      </li>
                    ))}
                  </ul>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Route Map Visualization */}
      <div className="py-16 bg-white">
        <div className="container">
          <RouteMapVisualization />
        </div>
      </div>

      {/* High Paying Lanes Table */}
      <div className="py-16" style={{ backgroundColor: BRAND.navy }}>
        <div className="container">
          <motion.div className="text-center mb-10" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}>
            <Badge className="mb-4 px-4 py-2 text-xs font-bold border-0 !bg-orange-500/30 text-orange-600">
              <TrendingUp className="h-4 w-4 mr-1.5" />
              HIGH PAYING LANES THIS WEEK
            </Badge>
            <h2 className="text-3xl md:text-4xl font-black text-white">
              Top Earning Freight Lanes
            </h2>
            <p className="text-white/90 mt-2">Updated weekly with current market rates</p>
          </motion.div>

          <motion.div className="max-w-5xl mx-auto" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}>
            {/* Desktop Table */}
            <div className="hidden md:block bg-white rounded-xl overflow-hidden shadow-xl">
              <div className="grid grid-cols-12 gap-4 px-6 py-4 text-xs font-bold uppercase tracking-wider border-b" style={{ backgroundColor: BRAND.lightGray, color: BRAND.navy }}>
                <div className="col-span-1">#</div>
                <div className="col-span-4">Lane</div>
                <div className="col-span-2 text-center">Miles</div>
                <div className="col-span-2 text-center">Transit</div>
                <div className="col-span-2 text-center">Rate</div>
                <div className="col-span-1 text-center">Status</div>
              </div>
              
              {lanesData.map((lane, index) => (
                <div 
                  key={index}
                  className={`grid grid-cols-12 gap-4 px-6 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${lane.status === 'hot' ? 'bg-green-50/50' : ''}`}
                >
                  <div className="col-span-1 text-gray-700 font-mono font-bold">{lane.rank}</div>
                  <div className="col-span-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" style={{ color: BRAND.navy }} />
                      <span className="font-semibold" style={{ color: BRAND.navy }}>{lane.from}</span>
                      <ArrowRight className="h-3 w-3 text-gray-500" />
                      <span className="text-gray-600">{lane.to}</span>
                    </div>
                  </div>
                  <div className="col-span-2 text-center text-gray-600">{lane.miles}</div>
                  <div className="col-span-2 text-center text-gray-700 text-sm">{lane.transitTime}</div>
                  <div className="col-span-2 text-center font-bold text-lg" style={{ color: BRAND.green }}>{lane.rate}</div>
                  <div className="col-span-1 text-center">
                    {lane.status === 'hot' ? (
                      <Badge className="text-xs font-bold border-0 !bg-orange-500/30 text-orange-600">HOT</Badge>
                    ) : (
                      <Badge variant="outline" className="!bg-gray-100 border-gray-300 text-xs font-semibold" style={{ color: '#111827' }}>Open</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile Lane Cards */}
            <div className="md:hidden space-y-3">
              {lanesData.map((lane, index) => (
                <motion.div 
                  key={index}
                  variants={cardVariants}
                  className={`bg-white rounded-xl p-4 shadow-md ${lane.status === 'hot' ? 'ring-2' : ''}`}
                  style={{ ['--tw-ring-color' as string]: lane.status === 'hot' ? BRAND.orange : undefined }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ backgroundColor: BRAND.navy }}>{lane.rank}</span>
                      {lane.status === 'hot' && (
                        <Badge className="text-xs font-bold border-0 !bg-orange-500/30 text-orange-600">HOT</Badge>
                      )}
                    </div>
                    <div className="text-2xl font-black" style={{ color: BRAND.green }}>{lane.rate}</div>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-4 w-4" style={{ color: BRAND.navy }} />
                    <span className="font-semibold" style={{ color: BRAND.navy }}>{lane.from}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 mb-3">
                    <ArrowRight className="h-4 w-4 ml-0.5" />
                    <span>{lane.to}</span>
                  </div>
                  <div className="flex gap-4 text-sm text-gray-600 font-medium">
                    <span>{lane.miles} miles</span>
                    <span>•</span>
                    <span>{lane.transitTime}</span>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* View All CTA */}
            <div className="text-center mt-8">
              <Button variant="outline" className="border-2 border-white text-white bg-white/10 hover:bg-white hover:text-[#001F3F] font-bold" asChild>
                <Link href="/apply">
                  View All Available Lanes
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Equipment Section */}
      <div className="py-16" style={{ backgroundColor: BRAND.lightGray }}>
        <div className="container">
          <motion.div className="text-center mb-10" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}>
            <Badge className="mb-4 px-4 py-2 text-xs font-bold border-0 !bg-[#001F3F] text-white">
              <Truck className="h-4 w-4 mr-1.5" />
              EQUIPMENT & FLEET
            </Badge>
            <h2 className="text-3xl md:text-4xl font-black mb-3" style={{ color: BRAND.navy }}>
              What You&apos;ll Drive
            </h2>
            <p className="text-gray-600">Late-model trucks with all the amenities you need for comfortable hauling</p>
          </motion.div>

          <motion.div className="grid md:grid-cols-3 gap-6" variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            {[
              { type: "Day Cab", for: "Local Routes", icon: <Truck className="h-8 w-8" />, features: ["No sleeper needed", "Easier maneuvering", "Better fuel economy", "Perfect for short hauls"] },
              { type: "Sleeper Cab", for: "Regional Routes", icon: <Truck className="h-8 w-8" />, features: ["Comfortable twin bed", "Mini fridge included", "Microwave ready", "APU for comfort"] },
              { type: "Full Sleeper", for: "OTR Routes", icon: <Truck className="h-8 w-8" />, features: ["Full-size bed", "Full refrigerator", "APU standard", "TV mount ready"] },
            ].map((equipment, index) => (
              <motion.div key={index} variants={cardVariants}>
                <Card className="bg-white border-gray-200 p-6 hover:shadow-lg transition-all h-full">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 rounded-xl" style={{ backgroundColor: `${BRAND.navy}15`, color: BRAND.navy }}>{equipment.icon}</div>
                    <div>
                      <h3 className="font-bold text-lg" style={{ color: BRAND.navy }}>{equipment.type}</h3>
                      <p className="text-gray-600 text-sm font-medium">For {equipment.for}</p>
                    </div>
                  </div>
                  <ul className="space-y-2">
                    {equipment.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-gray-700 text-sm">
                        <CheckCircle2 className="h-4 w-4 flex-shrink-0" style={{ color: BRAND.green }} />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* FAQ Section for SEO */}
      <div className="py-16 bg-white">
        <div className="container">
          <motion.div className="text-center mb-10" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}>
            <Badge className="mb-4 px-4 py-2 text-xs font-bold border-0 !bg-[#001F3F] text-white">
              <HelpCircle className="h-4 w-4 mr-1.5" />
              FREQUENTLY ASKED QUESTIONS
            </Badge>
            <h2 className="text-3xl md:text-4xl font-black mb-3" style={{ color: BRAND.navy }}>
              Common Questions About Our Routes
            </h2>
          </motion.div>

          <div className="max-w-3xl mx-auto space-y-4">
            {routeFAQs.map((faq, index) => (
              <motion.div 
                key={index}
                variants={cardVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
              >
                <Card 
                  className="border-gray-200 overflow-hidden cursor-pointer"
                  onClick={() => setExpandedFAQ(expandedFAQ === index ? null : index)}
                >
                  <div className="p-5 flex items-center justify-between">
                    <h3 className="font-bold pr-4" style={{ color: BRAND.navy }}>{faq.question}</h3>
                    <ChevronDown 
                      className={`h-5 w-5 flex-shrink-0 transition-transform ${expandedFAQ === index ? 'rotate-180' : ''}`}
                      style={{ color: BRAND.navy }}
                    />
                  </div>
                  {expandedFAQ === index && (
                    <div className="px-5 pb-5 pt-0">
                      <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                    </div>
                  )}
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Trust Indicators */}
      <div className="py-12" style={{ backgroundColor: BRAND.lightGray }}>
        <div className="container">
          <div className="flex flex-wrap justify-center items-center gap-8">
            {TRUST_INDICATORS.certifications.slice(0, 4).map((cert, index) => (
              <div key={index} className="flex items-center gap-3 text-gray-800">
                <Shield className="h-6 w-6" style={{ color: BRAND.navy }} />
                <span className="font-semibold">{cert.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-16" style={{ backgroundColor: BRAND.orange }}>
        <div className="container text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}>
            <h2 className="text-3xl md:text-4xl font-black mb-4" style={{ color: BRAND.navy }}>
              Ready to Start Earning?
            </h2>
            <p className="text-lg mb-8 max-w-2xl mx-auto font-medium" style={{ color: BRAND.navy }}>
              Join our growing fleet of {routes.length > 0 ? '15+' : ''} drivers and start hauling on the routes that fit your lifestyle. Apply in just 60 seconds!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
              <Button size="lg" className="font-bold text-base hover:scale-105 transition-transform !bg-[#001F3F] !from-[#001F3F] !to-[#002B5C] text-white hover:!bg-[#002B5C]" asChild>
                <Link href="/apply">
                  Apply Now - Start Today
                  <ChevronRight className="h-5 w-5 ml-2" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="font-bold text-base border-2 border-[#001F3F] text-[#001F3F] hover:scale-105 transition-transform !bg-transparent hover:!bg-[#001F3F]/10" asChild>
                <Link href={`tel:${COMPANY_INFO.phoneFormatted}`}>
                  <Phone className="h-4 w-4 mr-2" />
                  Call {COMPANY_INFO.phone}
                </Link>
              </Button>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm font-medium" style={{ color: BRAND.navy }}>
              <span className="flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> CDL-A Required</span>
              <span>•</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> 2+ Years for OTR</span>
              <span>•</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> 1+ Year for Local/Regional</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Sticky Apply CTA - Mobile */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-lg md:hidden z-50">
        <Button className="w-full font-bold text-base !bg-orange-500 !from-orange-500 !to-orange-600 hover:!bg-orange-600" size="lg" asChild>
          <Link href="/apply" className="text-[#001F3F]">
            Apply Now - Check Lane Availability
            <ChevronRight className="h-5 w-5 ml-2" />
          </Link>
        </Button>
      </div>

      {/* Add padding for mobile sticky CTA */}
      <div className="h-20 md:hidden" />

        {/* CSS for marquee animation */}
        <style jsx>{`
          @keyframes marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
        `}</style>
      </div>
    </>
  )
}
