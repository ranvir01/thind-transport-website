"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import { 
  Truck, 
  Box, 
  Snowflake, 
  Layers,
  Wrench, 
  Clock, 
  Shield, 
  Gauge,
  Zap,
  Wind,
  AlertTriangle,
  Refrigerator,
  ArrowRight,
  CheckCircle2,
  Cog,
  Radio,
  BatteryCharging,
  Star,
  Play,
  ChevronDown,
  ChevronUp,
  Award,
  Users,
  MapPin,
  Heart,
  ThumbsUp,
  Quote,
  TrendingUp,
  Bed,
  Wifi,
  Thermometer,
  Lock,
  Eye,
  Phone,
  Calendar
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { COMPANY_INFO } from "@/lib/constants"
import { PageBreadcrumb } from "@/components/shared/PageBreadcrumb"

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05
    }
  }
}

const cardVariants = {
  hidden: { 
    opacity: 0, 
    y: 30,
    scale: 0.97
  },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 120,
      damping: 17
    }
  }
}

const fadeInUp = {
  hidden: { opacity: 0, y: 25 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const }
  }
}

// Enhanced Fleet data with more details for SEO
const trucks = [
  {
    id: 1,
    name: "Freightliner Cascadia",
    year: "2023-2025",
    image: "/images/generated/truck-cascadia.png",
    engine: "Detroit DD15",
    horsepower: "505 HP",
    torque: "1,850 lb-ft",
    transmission: "DT12 Automated",
    sleeper: "77\" Mid-Roof Sleeper",
    mpg: "8.5+ MPG",
    features: [
      { icon: Zap, label: "APU Standard" },
      { icon: BatteryCharging, label: "2000W Inverter" },
      { icon: Refrigerator, label: "Full-Size Fridge" },
      { icon: AlertTriangle, label: "Collision Mitigation" },
    ],
    specs: [
      "505 HP @ 1,800 RPM",
      "1,850 lb-ft Torque",
      "77\" Mid-Roof Sleeper",
      "Lane Departure Warning",
      "Electronic Stability Control",
      "Adaptive Cruise Control"
    ],
    amenities: [
      "Stand-up sleeper cab",
      "Memory foam mattress",
      "Microwave-ready outlets",
      "USB charging ports",
      "Premium sound system"
    ],
    highlight: "Driver Favorite",
    popular: true
  },
  {
    id: 2,
    name: "Volvo VNL 860",
    year: "2024-2025",
    image: "/images/generated/truck-volvo.png",
    engine: "Volvo D13",
    horsepower: "500 HP",
    torque: "1,850 lb-ft",
    transmission: "I-Shift Automated",
    sleeper: "77\" Globetrotter XL",
    mpg: "8.7+ MPG",
    features: [
      { icon: Zap, label: "Integrated APU" },
      { icon: BatteryCharging, label: "2500W Inverter" },
      { icon: Refrigerator, label: "Premium Fridge" },
      { icon: Wind, label: "Premium A/C" },
    ],
    specs: [
      "500 HP Turbo Compound",
      "1,850 lb-ft Torque",
      "77\" Globetrotter XL",
      "Adaptive Cruise Control",
      "Volvo Active Driver Assist",
      "Predictive Powertrain"
    ],
    amenities: [
      "Industry-best sleeper cab",
      "Dual bunk option available",
      "Integrated living space",
      "Premium entertainment system",
      "Leather seats available"
    ],
    highlight: "Comfort King",
    popular: true
  },
  {
    id: 3,
    name: "Freightliner Cascadia",
    year: "2023",
    image: "/images/generated/truck-cascadia-2.png",
    engine: "Detroit DD15",
    horsepower: "455 HP",
    torque: "1,650 lb-ft",
    transmission: "DT12 Automated",
    sleeper: "72\" Raised Roof",
    mpg: "9.0+ MPG",
    features: [
      { icon: Zap, label: "APU Standard" },
      { icon: BatteryCharging, label: "1800W Inverter" },
      { icon: Refrigerator, label: "Microwave Ready" },
      { icon: AlertTriangle, label: "Safety Suite" },
    ],
    specs: [
      "455 HP Efficient",
      "1,650 lb-ft Torque",
      "72\" Raised Roof",
      "Electronic Stability",
      "ABS with Disc Brakes",
      "LED Headlights"
    ],
    amenities: [
      "Efficient sleeper design",
      "Quality mattress",
      "Storage compartments",
      "12V outlets throughout",
      "Bluetooth connectivity"
    ],
    highlight: "Fuel Efficient",
    popular: false
  },
  {
    id: 4,
    name: "Volvo VNL 760",
    year: "2024",
    image: "/images/generated/truck-volvo-2.png",
    engine: "Volvo D13",
    horsepower: "455 HP",
    torque: "1,750 lb-ft",
    transmission: "I-Shift 12-Speed",
    sleeper: "70\" Mid-Roof",
    mpg: "8.8+ MPG",
    features: [
      { icon: Zap, label: "Bunk Heater" },
      { icon: BatteryCharging, label: "2000W Inverter" },
      { icon: Refrigerator, label: "Full Fridge" },
      { icon: Gauge, label: "Driver Display" },
    ],
    specs: [
      "455 HP",
      "1,750 lb-ft Torque",
      "70\" Mid-Roof",
      "Volvo Active Driver Assist",
      "I-See Predictive Cruise",
      "Advanced Driver Display"
    ],
    amenities: [
      "Comfortable sleeper",
      "Good standing room",
      "Ample storage",
      "Climate control",
      "Ergonomic seating"
    ],
    highlight: "All-Rounder",
    popular: false
  }
]

const trailers = [
  {
    type: "Dry Van",
    icon: Box,
    count: "8+",
    specs: ["53' Standard Length", "Air-Ride Suspension", "Swing Doors", "New Tires", "LED Interior Lights", "Logistics Posts"],
    description: "Clean, road-ready dry vans for general freight. Regularly inspected and maintained.",
    image: "/images/generated/trailer-dry-van.png"
  },
  {
    type: "Refrigerated",
    icon: Snowflake,
    count: "4+",
    specs: ["Thermo King Unit", "-20°F to 70°F Range", "Multi-Temp Ready", "GPS Tracking", "Fuel Efficient Units", "Remote Monitoring"],
    description: "Temperature-controlled units for perishables. State-of-the-art reefer technology.",
    image: "/images/generated/trailer-reefer.png"
  },
  {
    type: "Flatbed",
    icon: Layers,
    count: "3+",
    specs: ["48' & 53' Options", "Coil Package Ready", "Fresh Tarps Provided", "Chains & Binders", "Winches Included", "Headache Racks"],
    description: "Heavy-duty flatbeds for specialized loads. All securement equipment included.",
    image: "/images/generated/trailer-flatbed.png"
  }
]

const maintenanceFeatures = [
  {
    icon: Wrench,
    title: "In-House Shop",
    description: "Full-service maintenance facility with ASE-certified technicians. Most repairs done same-day.",
    stat: "24hr"
  },
  {
    icon: Clock,
    title: "24/7 Road Support",
    description: "Breakdown? We've got you. Road assistance anytime, anywhere in the continental US.",
    stat: "365"
  },
  {
    icon: Shield,
    title: "Preventive Care",
    description: "Scheduled maintenance every 25,000 miles. We fix it before it breaks. You keep rolling.",
    stat: "25K"
  }
]

// Driver testimonials specific to equipment
const equipmentTestimonials = [
  {
    name: "Marcus J.",
    role: "OTR Driver, 3 Years",
    quote: "The Cascadia's sleeper is like a hotel room. APU keeps me comfortable all night without idling. Best equipment I've ever driven.",
    rating: 5,
    truck: "Freightliner Cascadia"
  },
  {
    name: "Sarah T.",
    role: "Regional Driver, 2 Years", 
    quote: "Volvo's I-Shift is incredible. My back thanks me every day. The safety features have saved me twice in bad weather.",
    rating: 5,
    truck: "Volvo VNL 860"
  },
  {
    name: "David R.",
    role: "Owner Operator, 5 Years",
    quote: "When my truck needed repairs, their shop had me back on the road in 4 hours. Other companies left me sitting for days.",
    rating: 5,
    truck: "Fleet Maintenance"
  }
]

// FAQ data for SEO
const faqs = [
  {
    question: "What year models are in the Thind Transport fleet?",
    answer: "Our fleet consists exclusively of 2023-2025 model year trucks. We operate Freightliner Cascadias and Volvo VNL 860s/760s. No truck in our fleet is older than 3 years, ensuring you always drive reliable, modern equipment."
  },
  {
    question: "Do all trucks come with APUs and inverters?",
    answer: "Yes! Every truck in our fleet comes standard with an APU (Auxiliary Power Unit) and a high-power inverter (1800W-2500W). You'll never need to idle for climate control, and you can run all your devices including microwaves, TVs, and gaming systems."
  },
  {
    question: "What safety features are included?",
    answer: "All trucks include Detroit Assurance or Volvo Active Driver Assist safety suites with: Lane Departure Warning, Collision Mitigation, Adaptive Cruise Control, Electronic Stability Control, and ABS with disc brakes. Your safety is our priority."
  },
  {
    question: "What happens if my truck breaks down on the road?",
    answer: "Call our 24/7 dispatch line and we'll have roadside assistance to you within 4 hours on average. For repairs we can't do roadside, we'll get you to the nearest certified shop and cover all costs. We also provide rental equipment if repairs take longer than expected."
  },
  {
    question: "How often is preventive maintenance performed?",
    answer: "Every truck receives a full preventive maintenance inspection every 25,000 miles at our in-house shop. We also perform DOT inspections in advance of due dates. Our 98.5% uptime rate proves this system works."
  },
  {
    question: "Can I personalize my assigned truck?",
    answer: "Absolutely! While the truck remains company property, you can add personal touches like seat covers, phone mounts, and non-permanent modifications. For company drivers with good standing, we offer equipment upgrade opportunities after 6 months."
  }
]

// Why choose our fleet stats
const fleetStats = [
  { value: "98.5%", label: "Fleet Uptime", icon: TrendingUp },
  { value: "0", label: "DOT Violations (2024)", icon: Shield },
  { value: "< 4hrs", label: "Avg Repair Response", icon: Clock },
  { value: "2.5yr", label: "Avg Fleet Age", icon: Calendar }
]

export default function FleetPage() {
  const [activeTab, setActiveTab] = useState<"trucks" | "trailers">("trucks")
  const [hoveredCard, setHoveredCard] = useState<number | null>(null)
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)
  const [showVideo, setShowVideo] = useState(false)
  const [selectedTruck, setSelectedTruck] = useState<number | null>(null)

  return (
    <div className="min-h-screen bg-white selection:bg-orange selection:text-white">
      <PageBreadcrumb pageName="Our Fleet" category="Company" />
      
      {/* Hero Section with Video Option */}
      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden bg-navy">
        {/* Video Background (optional) */}
        {showVideo ? (
          <video
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover opacity-30"
          >
            <source src="/images/generated/hero-american-fleet.mp4?v=3" type="video/mp4" />
          </video>
        ) : (
          <>
            {/* Gradient overlays */}
            <div className="absolute inset-0 bg-gradient-to-br from-navy via-navy-600 to-navy-800" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange/10 via-transparent to-transparent" />
          </>
        )}
        
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />

        {/* Hero image - positioned right */}
        <div className="absolute right-0 top-0 bottom-0 w-1/2 hidden lg:block">
          <div className="relative h-full">
            <Image
              src="/images/generated/truck-cascadia.png"
              alt="2024 Freightliner Cascadia truck - Thind Transport fleet equipment"
              fill
              className="object-cover object-center opacity-40"
              priority
              sizes="50vw"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/80 to-transparent" />
          </div>
        </div>

        {/* Content */}
        <div className="container relative z-10 px-4 py-24 md:py-32">
          <motion.div 
            className="max-w-3xl"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: { 
                opacity: 1, 
                transition: { staggerChildren: 0.12 } 
              }
            }}
          >
            <motion.div variants={fadeInUp} className="flex flex-wrap items-center gap-3 mb-6">
              <Badge className="bg-orange/20 text-orange border-orange/30 px-4 py-2 text-sm font-bold backdrop-blur-sm">
                <Truck className="h-4 w-4 mr-2 inline" />
                2023-2025 Model Fleet
              </Badge>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 px-4 py-2 text-sm font-bold backdrop-blur-sm">
                <CheckCircle2 className="h-4 w-4 mr-2 inline" />
                All APU Equipped
              </Badge>
            </motion.div>
            
            <motion.h1 
              variants={fadeInUp}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white mb-6 leading-[1.1] tracking-tight"
            >
              Modern Power.
              <br />
              <span className="text-orange">Maximum Comfort.</span>
            </motion.h1>
            
            <motion.p 
              variants={fadeInUp}
              className="text-lg md:text-xl text-white/80 max-w-2xl leading-relaxed mb-4"
            >
              Drive the newest Freightliner Cascadias & Volvo VNL 860s. 
              <span className="text-white font-semibold"> Every truck equipped with APU, inverter, and full safety suite.</span>
            </motion.p>

            <motion.p 
              variants={fadeInUp}
              className="text-base text-white/80 max-w-xl leading-relaxed mb-8"
            >
              No old equipment. No excuses. Just premium trucks maintained by our in-house shop 
              with 24/7 road support. Your comfort and uptime are our priority.
            </motion.p>

            <motion.div 
              variants={fadeInUp}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Button 
                asChild
                size="lg" 
                className="bg-orange hover:bg-orange-600 text-white font-bold text-lg px-8 py-6 shadow-cta hover:shadow-cta-hover transition-all duration-300 group"
              >
                <Link href="/apply">
                  Apply to Drive This Equipment
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button 
                variant="outline"
                size="lg"
                className="border-2 border-white/50 text-white hover:bg-white/20 font-semibold text-lg px-8 py-6 backdrop-blur-sm group"
                onClick={() => {
                  document.getElementById('fleet-section')?.scrollIntoView({ behavior: 'smooth' })
                }}
              >
                <Play className="mr-2 h-5 w-5" />
                Explore Fleet
              </Button>
            </motion.div>

            {/* Trust indicators row */}
            <motion.div 
              variants={fadeInUp}
              className="flex flex-wrap items-center gap-6 mt-10 pt-8 border-t border-white/10"
            >
              {fleetStats.map((stat, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange/20 flex items-center justify-center">
                    <stat.icon className="h-5 w-5 text-orange" />
                  </div>
                  <div>
                    <div className="text-xl md:text-2xl font-black text-orange">{stat.value}</div>
                    <div className="text-xs text-white/70 font-medium">{stat.label}</div>
                  </div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-neutral-50 to-transparent" />
      </section>

      {/* Why Our Equipment Section - Trust Builder */}
      <section className="py-16 bg-neutral-50">
        <div className="container px-4">
          <motion.div 
            className="text-center mb-12"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <Badge className="mb-4 bg-navy text-white px-4 py-2 text-xs font-bold">
              The Thind Difference
            </Badge>
            <h2 className="text-3xl md:text-4xl font-black text-navy mb-4">
              Why Drivers <span className="text-orange">Choose Our Equipment</span>
            </h2>
            <p className="text-lg text-steel max-w-2xl mx-auto">
              Mega carriers cut corners on equipment. We don't. Here's what sets us apart.
            </p>
          </motion.div>

          <motion.div 
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {[
              { 
                icon: Calendar, 
                title: "Newest Fleet", 
                desc: "Average fleet age under 2.5 years. No trucks older than 2023.",
                highlight: "2023-2025 Only"
              },
              { 
                icon: Zap, 
                title: "APU Standard", 
                desc: "Every truck has APU. No idling, no fuel waste, always comfortable.",
                highlight: "100% Equipped"
              },
              { 
                icon: Wrench, 
                title: "In-House Shop", 
                desc: "Our technicians know our trucks. Most repairs same-day.",
                highlight: "< 4hr Response"
              },
              { 
                icon: Shield, 
                title: "Safety First", 
                desc: "Full safety suites: collision mitigation, lane departure, stability control.",
                highlight: "0 DOT Violations"
              },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                variants={cardVariants}
                className="bg-white rounded-2xl p-6 shadow-brand border border-neutral-100 hover:shadow-brand-lg hover:border-orange/20 transition-all duration-300 group"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange/10 to-orange/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <item.icon className="h-7 w-7 text-orange" />
                </div>
                <Badge className="mb-3 bg-navy/20 text-navy text-xs font-bold">{item.highlight}</Badge>
                <h3 className="text-lg font-bold text-navy mb-2">{item.title}</h3>
                <p className="text-sm text-steel leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Featured Equipment Section with Tabs */}
      <section id="fleet-section" className="py-20 bg-white">
        <div className="container px-4">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-navy text-white px-4 py-2 text-xs font-bold">
              Featured Equipment
            </Badge>
            <h2 className="text-3xl md:text-5xl font-black text-navy mb-4">
              What You'll Be Driving
            </h2>
            <p className="text-lg text-steel max-w-2xl mx-auto">
              Every unit hand-selected for driver comfort, safety, and reliability. 
              Click any truck for full specifications.
            </p>
          </div>

          {/* Tab buttons */}
          <div className="flex justify-center mb-12">
            <div className="inline-flex bg-neutral-100 rounded-2xl p-2 shadow-inner">
              <button
                onClick={() => setActiveTab("trucks")}
                className={cn(
                  "flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-sm transition-all duration-300",
                  activeTab === "trucks" 
                    ? "bg-navy text-white shadow-lg" 
                    : "text-steel hover:bg-white/50"
                )}
              >
                <Truck className="h-5 w-5" />
                Power Units ({trucks.length})
              </button>
              <button
                onClick={() => setActiveTab("trailers")}
                className={cn(
                  "flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-sm transition-all duration-300",
                  activeTab === "trailers" 
                    ? "bg-navy text-white shadow-lg" 
                    : "text-steel hover:bg-white/50"
                )}
              >
                <Box className="h-5 w-5" />
                Trailers ({trailers.length} Types)
              </button>
            </div>
          </div>

          {/* Trucks Grid */}
          <AnimatePresence mode="wait">
            {activeTab === "trucks" && (
              <motion.div 
                className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                key="trucks"
              >
                {trucks.map((truck) => (
                  <motion.div
                    key={truck.id}
                    variants={cardVariants}
                    onMouseEnter={() => setHoveredCard(truck.id)}
                    onMouseLeave={() => setHoveredCard(null)}
                    onClick={() => setSelectedTruck(selectedTruck === truck.id ? null : truck.id)}
                    className={cn(
                      "group relative bg-white rounded-2xl shadow-brand overflow-hidden border-2 cursor-pointer",
                      "transition-all duration-500 ease-out",
                      hoveredCard === truck.id ? "scale-[1.02] shadow-brand-lg border-orange/30" : "border-transparent",
                      selectedTruck === truck.id && "ring-2 ring-orange ring-offset-2"
                    )}
                  >
                    {/* Popular badge */}
                    {truck.popular && (
                      <div className="absolute top-0 right-0 z-20">
                        <div className="bg-gradient-to-r from-orange to-orange-500 text-white text-xs font-bold px-4 py-1.5 rounded-bl-xl">
                          <Star className="h-3 w-3 inline mr-1" />
                          POPULAR
                        </div>
                      </div>
                    )}

                    {/* Image container */}
                    <div className="relative h-56 bg-gradient-to-br from-neutral-100 to-neutral-200 overflow-hidden">
                      <Image
                        src={truck.image}
                        alt={`${truck.year} ${truck.name} - ${truck.engine} ${truck.horsepower} truck for CDL drivers`}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                      
                      {/* Highlight badge */}
                      <div className="absolute top-4 left-4">
                        <Badge className="bg-orange text-white font-bold px-3 py-1.5 shadow-lg">
                          {truck.highlight}
                        </Badge>
                      </div>

                      {/* Year badge */}
                      <div className="absolute top-4 right-4">
                        <Badge className="bg-white/95 text-navy font-bold px-3 py-1.5 backdrop-blur-sm shadow">
                          {truck.year}
                        </Badge>
                      </div>

                      {/* Truck name overlay */}
                      <div className="absolute bottom-4 left-4 right-4">
                        <h3 className="text-2xl font-black text-white mb-1">{truck.name}</h3>
                        <div className="flex items-center gap-2 text-white/90 text-sm">
                          <Cog className="h-4 w-4" />
                          <span className="font-semibold">{truck.engine}</span>
                          <span className="text-white/70">•</span>
                          <span>{truck.horsepower}</span>
                          <span className="text-white/70">•</span>
                          <span>{truck.mpg}</span>
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                      {/* Quick specs row */}
                      <div className="grid grid-cols-3 gap-3 mb-5 pb-5 border-b border-neutral-100">
                        <div className="text-center">
                          <div className="text-lg font-black text-navy">{truck.horsepower}</div>
                          <div className="text-xs text-steel">Horsepower</div>
                        </div>
                        <div className="text-center border-x border-neutral-100">
                          <div className="text-lg font-black text-navy">{truck.torque}</div>
                          <div className="text-xs text-steel">Torque</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-black text-navy">{truck.mpg}</div>
                          <div className="text-xs text-steel">Fuel Economy</div>
                        </div>
                      </div>

                      {/* Feature icons */}
                      <div className="grid grid-cols-4 gap-2 mb-5">
                        {truck.features.map((feature, idx) => (
                          <div 
                            key={idx}
                            className="flex flex-col items-center text-center p-2 rounded-xl bg-neutral-50 group-hover:bg-orange/5 transition-colors"
                          >
                            <feature.icon className="h-5 w-5 text-orange mb-1" />
                            <span className="text-[10px] text-steel font-medium leading-tight">{feature.label}</span>
                          </div>
                        ))}
                      </div>

                      {/* Expandable specs */}
                      <AnimatePresence>
                        {selectedTruck === truck.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                          >
                            <div className="pt-4 border-t border-neutral-100">
                              <h4 className="font-bold text-navy text-sm mb-3">Full Specifications</h4>
                              <div className="grid grid-cols-2 gap-2 mb-4">
                                {truck.specs.map((spec, idx) => (
                                  <div key={idx} className="flex items-center gap-2 text-sm text-steel">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                                    <span>{spec}</span>
                                  </div>
                                ))}
                              </div>
                              
                              <h4 className="font-bold text-navy text-sm mb-3">Sleeper Amenities</h4>
                              <div className="grid grid-cols-2 gap-2">
                                {truck.amenities.map((amenity, idx) => (
                                  <div key={idx} className="flex items-center gap-2 text-sm text-steel">
                                    <Bed className="h-3.5 w-3.5 text-orange flex-shrink-0" />
                                    <span>{amenity}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* CTA Row */}
                      <div className="flex items-center justify-between mt-5 pt-4 border-t border-neutral-100">
                        <button 
                          className="text-sm text-orange font-semibold flex items-center gap-1 hover:gap-2 transition-all"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedTruck(selectedTruck === truck.id ? null : truck.id)
                          }}
                        >
                          {selectedTruck === truck.id ? "Hide" : "View"} Specs
                          {selectedTruck === truck.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                        <Button 
                          asChild
                          size="sm"
                          className="bg-orange hover:bg-orange-600 text-white font-bold shadow-cta"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Link href="/apply">
                            Drive This Truck
                            <ArrowRight className="ml-1 h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* Trailers Grid */}
            {activeTab === "trailers" && (
              <motion.div 
                className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                key="trailers"
              >
                {trailers.map((trailer, idx) => (
                  <motion.div
                    key={idx}
                    variants={cardVariants}
                    className="group bg-white rounded-2xl shadow-brand overflow-hidden border-2 border-transparent hover:border-orange/20 hover:shadow-brand-lg transition-all duration-500 hover:scale-[1.02]"
                  >
                    {/* Trailer Image */}
                    <div className="relative h-48 bg-gradient-to-br from-neutral-100 to-neutral-200 overflow-hidden">
                      <Image
                        src={trailer.image}
                        alt={`${trailer.type} trailer - Thind Transport equipment`}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      <div className="absolute top-3 right-3">
                        <Badge className="bg-white/95 text-navy font-bold backdrop-blur-sm shadow">{trailer.count} Units</Badge>
                      </div>
                      <div className="absolute bottom-3 left-3">
                        <h3 className="text-xl font-black text-white">{trailer.type}</h3>
                      </div>
                    </div>

                    <div className="p-6">
                      {/* Icon header */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange/10 to-orange/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <trailer.icon className="h-5 w-5 text-orange" />
                        </div>
                        <p className="text-steel text-sm flex-1">{trailer.description}</p>
                      </div>

                      {/* Specs */}
                      <ul className="space-y-2">
                        {trailer.specs.map((spec, specIdx) => (
                          <li key={specIdx} className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                            <span className="text-steel">{spec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Driver Testimonials - Equipment Focused */}
      <section className="py-20 bg-neutral-50">
        <div className="container px-4">
          <motion.div 
            className="text-center mb-12"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <Badge className="mb-4 bg-navy text-white px-4 py-2 text-xs font-bold">
              <Users className="h-3 w-3 mr-1.5 inline" />
              Driver Reviews
            </Badge>
            <h2 className="text-3xl md:text-4xl font-black text-navy mb-4">
              What Drivers Say About <span className="text-orange">Our Equipment</span>
            </h2>
            <p className="text-lg text-steel max-w-2xl mx-auto">
              Real feedback from real drivers about the trucks they drive every day.
            </p>
          </motion.div>

          <motion.div 
            className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {equipmentTestimonials.map((testimonial, idx) => (
              <motion.div
                key={idx}
                variants={cardVariants}
                className="bg-white rounded-2xl p-6 shadow-brand border border-neutral-100 hover:shadow-brand-lg transition-all duration-300"
              >
                <Quote className="h-8 w-8 text-orange/20 mb-4" />
                <p className="text-steel leading-relaxed mb-6 italic">"{testimonial.quote}"</p>
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-orange text-orange" />
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-navy">{testimonial.name}</div>
                    <div className="text-sm text-steel">{testimonial.role}</div>
                  </div>
                  <Badge className="bg-orange/10 text-orange text-xs">{testimonial.truck}</Badge>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Maintenance Promise Section */}
      <section className="py-20 md:py-28 bg-navy relative overflow-hidden">
        {/* Background elements */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-orange/5 via-transparent to-transparent" />
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }}
        />

        <div className="container relative px-4">
          <motion.div 
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeInUp}
          >
            <Badge className="mb-4 bg-orange/20 text-orange border-orange/30 px-4 py-2 text-sm font-bold">
              <Shield className="h-4 w-4 mr-2 inline" />
              The Thind Maintenance Promise
            </Badge>
            <h2 className="text-3xl md:text-5xl font-black text-white mb-4">
              We Fix It <span className="text-orange">Before</span> It Breaks.
            </h2>
            <p className="text-lg text-white/70 max-w-2xl mx-auto">
              You keep rolling. Our dedicated maintenance team ensures your equipment 
              is always road-ready and safe. No excuses, no delays.
            </p>
          </motion.div>

          {/* Feature grid */}
          <motion.div 
            className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            {maintenanceFeatures.map((feature, idx) => (
              <motion.div
                key={idx}
                variants={cardVariants}
                className="text-center p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300 group"
              >
                <div className="w-20 h-20 rounded-2xl bg-orange/20 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:bg-orange/30 transition-all duration-300 relative">
                  <feature.icon className="h-10 w-10 text-orange" />
                  <div className="absolute -top-2 -right-2 bg-white text-navy text-xs font-black px-2 py-1 rounded-full shadow">
                    {feature.stat}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-white/80 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* CTA */}
          <motion.div 
            className="mt-12 text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
          >
            <p className="text-white/70 text-sm mb-4">Questions about our equipment or maintenance?</p>
            <Button
              asChild
              variant="outline"
              className="border-2 border-orange text-orange hover:bg-orange hover:text-white font-bold"
            >
              <Link href={`tel:${COMPANY_INFO.phoneFormatted}`}>
                <Phone className="mr-2 h-4 w-4" />
                Call {COMPANY_INFO.phone}
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Standard Equipment / Amenities Grid */}
      <section className="py-20 bg-white">
        <div className="container px-4">
          <div className="max-w-6xl mx-auto">
            <motion.div 
              className="text-center mb-16"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeInUp}
            >
              <Badge className="mb-4 bg-navy text-white px-4 py-2 text-xs font-bold">
                Standard on Every Truck
              </Badge>
              <h2 className="text-3xl md:text-5xl font-black text-navy mb-4">
                Everything You Need, <span className="text-orange">Included.</span>
              </h2>
              <p className="text-lg text-steel max-w-2xl mx-auto">
                No surprises, no upgrades needed. Every truck in our fleet comes fully equipped.
              </p>
            </motion.div>

            <motion.div 
              className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
            >
              {[
                { icon: Zap, title: "APU System", desc: "Stay comfortable without idling. Save fuel, protect the environment.", highlight: "Standard" },
                { icon: BatteryCharging, title: "High-Power Inverter", desc: "1800W-2500W inverters. Run microwave, TV, gaming systems.", highlight: "1800-2500W" },
                { icon: Refrigerator, title: "Full-Size Fridge", desc: "Keep food fresh on long hauls. No more truck stop food.", highlight: "Full Size" },
                { icon: Wifi, title: "Connectivity Ready", desc: "USB ports, 12V outlets, and Bluetooth throughout.", highlight: "Built-In" },
                { icon: AlertTriangle, title: "Collision Mitigation", desc: "Advanced safety systems to prevent accidents.", highlight: "Active Safety" },
                { icon: Thermometer, title: "Premium HVAC", desc: "Climate control that works. Heating and cooling zones.", highlight: "Dual Zone" },
                { icon: Eye, title: "Lane Departure", desc: "Stay safe with visual and audio alerts.", highlight: "Warning System" },
                { icon: Lock, title: "Security Features", desc: "Alarm systems, tracking, and secure storage.", highlight: "GPS Tracked" },
              ].map((item, idx) => (
                <motion.div
                  key={idx}
                  variants={cardVariants}
                  className="p-6 rounded-xl bg-neutral-50 hover:bg-orange/5 border border-neutral-100 hover:border-orange/20 transition-all duration-300 group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <item.icon className="h-8 w-8 text-orange group-hover:scale-110 transition-transform" />
                    <Badge className="bg-navy/20 text-navy text-[10px] font-bold">{item.highlight}</Badge>
                  </div>
                  <h3 className="font-bold text-navy mb-2">{item.title}</h3>
                  <p className="text-sm text-steel leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* FAQ Section - SEO Rich */}
      <section className="py-20 bg-neutral-50">
        <div className="container px-4">
          <motion.div 
            className="text-center mb-12"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <Badge className="mb-4 bg-navy text-white px-4 py-2 text-xs font-bold">
              Common Questions
            </Badge>
            <h2 className="text-3xl md:text-4xl font-black text-navy mb-4">
              Fleet & Equipment <span className="text-orange">FAQ</span>
            </h2>
            <p className="text-lg text-steel max-w-2xl mx-auto">
              Everything you need to know about driving for Thind Transport.
            </p>
          </motion.div>

          <motion.div 
            className="max-w-3xl mx-auto space-y-4"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {faqs.map((faq, idx) => (
              <motion.div
                key={idx}
                variants={cardVariants}
                className="bg-white rounded-xl shadow-brand border border-neutral-100 overflow-hidden"
              >
                <button
                  onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-neutral-50 transition-colors"
                >
                  <h3 className="font-bold text-navy pr-4">{faq.question}</h3>
                  <div className={cn(
                    "w-8 h-8 rounded-full bg-orange/10 flex items-center justify-center flex-shrink-0 transition-transform",
                    expandedFaq === idx && "rotate-180"
                  )}>
                    <ChevronDown className="h-5 w-5 text-orange" />
                  </div>
                </button>
                <AnimatePresence>
                  {expandedFaq === idx && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="px-6 pb-5 text-steel leading-relaxed border-t border-neutral-100 pt-4">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 md:py-28 bg-gradient-to-br from-orange via-orange-500 to-orange-600 relative overflow-hidden">
        {/* Background pattern */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `linear-gradient(45deg, rgba(0,0,0,0.1) 25%, transparent 25%),
                             linear-gradient(-45deg, rgba(0,0,0,0.1) 25%, transparent 25%),
                             linear-gradient(45deg, transparent 75%, rgba(0,0,0,0.1) 75%),
                             linear-gradient(-45deg, transparent 75%, rgba(0,0,0,0.1) 75%)`,
            backgroundSize: '20px 20px',
            backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
          }}
        />

        <div className="container relative px-4">
          <motion.div 
            className="max-w-3xl mx-auto text-center"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={{
              hidden: { opacity: 0, y: 30 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
            }}
          >
            <Badge className="mb-6 bg-white/20 text-white border-white/30 px-4 py-2">
              <Truck className="h-4 w-4 mr-2 inline" />
              Start Driving This Week
            </Badge>
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-black text-white mb-6 leading-tight">
              Ready to Upgrade Your Ride?
            </h2>
            <p className="text-xl text-white/90 mb-10 max-w-xl mx-auto">
              Join the drivers who chose better equipment, better support, and a better career path.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                asChild
                size="lg" 
                className="bg-navy hover:bg-navy-700 text-white font-bold text-lg px-10 py-7 shadow-xl hover:shadow-2xl transition-all duration-300 group"
              >
                <Link href="/apply">
                  Apply Now
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button 
                asChild
                size="lg" 
                variant="outline"
                className="border-2 border-navy bg-navy text-white hover:bg-navy-700 font-bold text-lg px-10 py-7"
              >
                <Link href={`tel:${COMPANY_INFO.phoneFormatted}`}>
                  <Phone className="mr-2 h-5 w-5" />
                  {COMPANY_INFO.phone}
                </Link>
              </Button>
            </div>
            <p className="mt-6 text-white/90 text-sm">
              Takes 2 minutes • Response within 24 hours • No commitment to apply
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
