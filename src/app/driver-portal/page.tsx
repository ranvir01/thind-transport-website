"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  UserCheck, Lock, TruckIcon, FileText, DollarSign, 
  Calendar, MapPin, Package, BarChart3, Shield,
  ChevronRight, Phone, Mail, LogOut, Clock,
  Fuel, Bell, MessageSquare, AlertTriangle, CheckCircle,
  Navigation, RefreshCw, ArrowRight, User,
  Timer, Gauge, Activity, Smartphone, Headphones,
  Download, Eye, Zap, Globe, Star, ChevronDown,
  CreditCard, Route, Settings, Wifi, CloudOff
} from "lucide-react"
import { COMPANY_INFO } from "@/lib/constants"
import { motion, AnimatePresence } from "framer-motion"
import { PageBreadcrumb } from "@/components/shared/PageBreadcrumb"

// ===========================================
// DRIVER DATA TYPES
// ===========================================

interface DriverProfile {
  id: string
  firstName: string
  lastName: string
  email: string
  driverId: string
  status: string
  truckId: string
  trailerId: string
  safetyScore: number
}

interface LoadData {
  id: string
  loadNumber: string
  status: string
  pickupCity: string
  pickupState: string
  deliveryCity: string
  deliveryState: string
  pickupDate: string
  deliveryDate: string
  miles: number
  rate: number
  commodity: string
}

interface SettlementData {
  id: string
  settlementNumber: string
  periodEnd: string
  grossPay: number
  netPay: number
  status: string
}

// Sample data for authenticated state
const SAMPLE_DRIVER: DriverProfile = {
  id: "D001",
  firstName: "James",
  lastName: "Wilson",
  email: "jwilson@thindtransport.com",
  driverId: "TT-4521",
  status: "active",
  truckId: "TRK-892",
  trailerId: "TRL-445",
  safetyScore: 98
}

const SAMPLE_LOAD: LoadData = {
  id: "L-78234",
  loadNumber: "TT-78234",
  status: "en_route_delivery",
  pickupCity: "Seattle",
  pickupState: "WA",
  deliveryCity: "Los Angeles",
  deliveryState: "CA",
  pickupDate: "2024-12-01",
  deliveryDate: "2024-12-03",
  miles: 1135,
  rate: 3405,
  commodity: "Consumer Electronics"
}

const SAMPLE_SETTLEMENTS: SettlementData[] = [
  { id: "S-1234", settlementNumber: "2024-W47", periodEnd: "2024-11-24", grossPay: 4250, netPay: 3825, status: "paid" },
  { id: "S-1233", settlementNumber: "2024-W46", periodEnd: "2024-11-17", grossPay: 3890, netPay: 3501, status: "paid" },
  { id: "S-1232", settlementNumber: "2024-W45", periodEnd: "2024-11-10", grossPay: 4100, netPay: 3690, status: "paid" },
]

// ===========================================
// MAIN COMPONENT
// ===========================================

export default function DriverPortalPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [loginError, setLoginError] = useState("")
  const [driverId, setDriverId] = useState("")
  const [password, setPassword] = useState("")
  const [activeTab, setActiveTab] = useState<"dashboard" | "loads" | "settlements" | "documents" | "messages">("dashboard")
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setLoginError("")
    
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    if (driverId && password) {
      setIsAuthenticated(true)
    } else {
      setLoginError("Please enter your Driver ID and password")
    }
    
    setIsLoading(false)
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setDriverId("")
    setPassword("")
    setActiveTab("dashboard")
  }

  if (isAuthenticated) {
    return (
      <DriverDashboard 
        driver={SAMPLE_DRIVER}
        currentLoad={SAMPLE_LOAD}
        recentSettlements={SAMPLE_SETTLEMENTS}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
      />
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PageBreadcrumb pageName="Driver Portal" category="Portal" />
      
      {/* Hero Section with Login */}
      <section className="relative overflow-hidden bg-navy text-white">
        {/* Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange/10 rounded-full blur-3xl" />
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5" />
        </div>
        
        <div className="container relative py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Hero Content */}
            <div>
              <Badge className="mb-6 bg-orange-500 text-white border-0 px-4 py-2 text-sm font-bold">
                <Shield className="h-4 w-4 mr-2" />
                Secure 256-bit Encrypted Portal
              </Badge>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 leading-[1.1]">
                Your Complete
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-500">
                  Driver Command Center
                </span>
              </h1>
              
              <p className="text-xl text-white/80 mb-8 leading-relaxed max-w-xl">
                Manage loads, track earnings, access documents, and communicate with dispatch — all from one powerful dashboard, accessible 24/7 from any device.
              </p>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="text-center p-4 bg-white/10 rounded-xl border border-white/20">
                  <p className="text-3xl font-black text-orange-400">24/7</p>
                  <p className="text-xs text-white/90 uppercase tracking-wider font-semibold">Access</p>
                </div>
                <div className="text-center p-4 bg-white/10 rounded-xl border border-white/20">
                  <p className="text-3xl font-black text-green-400">Real-time</p>
                  <p className="text-xs text-white/90 uppercase tracking-wider font-semibold">Updates</p>
                </div>
                <div className="text-center p-4 bg-white/10 rounded-xl border border-white/20">
                  <p className="text-3xl font-black text-blue-300">100%</p>
                  <p className="text-xs text-white/90 uppercase tracking-wider font-semibold">Paperless</p>
                </div>
              </div>

              {/* Trust Signals */}
              <div className="flex items-center gap-4 text-sm text-white/70">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="font-medium">Bank-Level Security</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="font-medium">Mobile Optimized</span>
                </div>
              </div>
            </div>

            {/* Right: Login Card */}
            <div>
              <Card className="p-8 shadow-2xl border-0 bg-white">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#001F3F] to-[#003366] flex items-center justify-center">
                    <UserCheck className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-gray-900">Driver Login</h2>
                    <p className="text-sm text-gray-500">Access your personalized dashboard</p>
                  </div>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                  <div>
                    <Label htmlFor="driver-id" className="text-sm font-bold text-gray-700">Driver ID or Email</Label>
                    <Input 
                      id="driver-id"
                      type="text" 
                      placeholder="TT-XXXX or email@example.com"
                      value={driverId}
                      onChange={(e) => setDriverId(e.target.value)}
                      className="mt-2 h-12 text-base border-gray-200 focus:border-[#001F3F] focus:ring-4 focus:ring-blue-50"
                    />
                  </div>

                  <div>
                    <Label htmlFor="password" className="text-sm font-bold text-gray-700">Password</Label>
                    <Input 
                      id="password"
                      type="password" 
                      placeholder="Enter your secure password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="mt-2 h-12 text-base border-gray-200 focus:border-[#001F3F] focus:ring-4 focus:ring-blue-50"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" className="rounded border-gray-300 text-[#001F3F] focus:ring-[#001F3F]" />
                      <span className="text-gray-600">Remember this device</span>
                    </label>
                    <Link href="/driver-portal/forgot-password" className="text-sm text-[#001F3F] hover:underline font-semibold">
                      Forgot password?
                    </Link>
                  </div>

                  {loginError && (
                    <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                      <p className="text-sm text-red-700 font-medium">{loginError}</p>
                    </div>
                  )}

                  <Button 
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-14 text-base font-bold bg-gradient-to-r from-[#001F3F] to-[#003366] hover:from-[#003366] hover:to-[#004080] shadow-xl hover:shadow-2xl transform hover:-translate-y-0.5 transition-all duration-200"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                        Authenticating...
                      </>
                    ) : (
                      <>
                        <Lock className="h-5 w-5 mr-2" />
                        Sign In to Portal
                      </>
                    )}
                  </Button>
                </form>

                <div className="mt-6 pt-6 border-t border-gray-100">
                  <p className="text-center text-sm text-gray-600">
                    Not yet a Thind Transport driver?{" "}
                    <Link href="/apply" className="text-[#001F3F] hover:underline font-bold">
                      Apply Now →
                    </Link>
                  </p>
                </div>

                {/* Support */}
                <div className="mt-6 p-4 bg-slate-50 rounded-xl">
                  <p className="text-sm font-bold text-gray-700 mb-3">Need Assistance?</p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <a 
                      href={`tel:${COMPANY_INFO.phoneFormatted}`}
                      className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#001F3F] transition-colors"
                    >
                      <Phone className="h-4 w-4" />
                      <span className="font-semibold">{COMPANY_INFO.phone}</span>
                    </a>
                    <a 
                      href={`mailto:${COMPANY_INFO.email}`}
                      className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#001F3F] transition-colors"
                    >
                      <Mail className="h-4 w-4" />
                      <span className="font-semibold">Email Support</span>
                    </a>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Portal Features Section */}
      <section className="py-20 bg-white">
        <div className="container">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-green-100 text-green-700 px-4 py-1.5 text-xs font-bold">
              COMPREHENSIVE DRIVER TOOLS
            </Badge>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
              Everything You Need to{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#001F3F] to-[#003366]">
                Maximize Earnings
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our driver portal is designed by drivers, for drivers. Access powerful tools that help you earn more, stay compliant, and work smarter.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard 
              icon={<Package className="h-7 w-7" />}
              title="Load Board & Management"
              description="Browse available loads, view load details, accept assignments instantly, and track your deliveries in real-time with GPS integration."
              highlights={["Real-time load matching", "One-tap acceptance", "Route optimization"]}
              color="blue"
            />
            <FeatureCard 
              icon={<DollarSign className="h-7 w-7" />}
              title="Earnings & Settlements"
              description="Track your earnings in real-time, view detailed pay statements, download 1099s and tax documents, and monitor your revenue per mile."
              highlights={["Weekly settlements", "Tax document access", "Revenue analytics"]}
              color="green"
            />
            <FeatureCard 
              icon={<FileText className="h-7 w-7" />}
              title="Document Management"
              description="Upload and store all your documents securely. Get automatic expiration alerts for CDL, medical cards, and insurance documents."
              highlights={["Cloud storage", "Expiration alerts", "Easy uploads"]}
              color="purple"
            />
            <FeatureCard 
              icon={<Timer className="h-7 w-7" />}
              title="HOS & ELD Integration"
              description="View your hours of service status, track remaining drive time, and ensure compliance with DOT regulations at a glance."
              highlights={["Real-time HOS", "Compliance alerts", "Violation prevention"]}
              color="orange"
            />
            <FeatureCard 
              icon={<Fuel className="h-7 w-7" />}
              title="Fuel Card & Discounts"
              description="Check your fuel card balance, find discount fuel stations along your route, and track fuel purchases and MPG performance."
              highlights={["Card balance", "Discount locations", "Fuel analytics"]}
              color="red"
            />
            <FeatureCard 
              icon={<MessageSquare className="h-7 w-7" />}
              title="Dispatch Communication"
              description="Message dispatch directly, receive load updates instantly, and access 24/7 support through the integrated messaging system."
              highlights={["Direct messaging", "Push notifications", "24/7 support"]}
              color="indigo"
            />
          </div>
        </div>
      </section>

      {/* Mobile App Section */}
      <section className="py-20 bg-navy text-white overflow-hidden">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-6 bg-orange text-white border-0 px-4 py-2 text-sm font-bold">
                <Smartphone className="h-4 w-4 mr-2" />
                MOBILE ACCESS
              </Badge>
              <h2 className="text-4xl md:text-5xl font-black mb-6 text-white">
                Your Portal,{" "}
                <span className="text-orange">Everywhere You Go</span>
              </h2>
              <p className="text-xl text-white/80 mb-8 leading-relaxed">
                Access your complete driver dashboard from any smartphone, tablet, or computer. Our mobile-optimized portal works seamlessly whether you&apos;re in the cab, at a truck stop, or at home.
              </p>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-4 p-4 bg-white/10 rounded-xl border border-white/20">
                  <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                    <Wifi className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white">Works On Any Network</h4>
                    <p className="text-sm text-white/80">Optimized for slow connections on the road</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-white/10 rounded-xl border border-white/20">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <CloudOff className="w-6 h-6 text-blue-300" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white">Offline Document Access</h4>
                    <p className="text-sm text-white/80">View saved documents without internet</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-white/10 rounded-xl border border-white/20">
                  <div className="w-12 h-12 bg-orange/20 rounded-xl flex items-center justify-center">
                    <Bell className="w-6 h-6 text-orange" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white">Push Notifications</h4>
                    <p className="text-sm text-white/80">Instant alerts for new loads and messages</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-orange/20 to-blue-500/20 rounded-3xl blur-3xl" />
              <div className="relative bg-white/5 rounded-3xl p-8 border border-white/20 backdrop-blur-sm">
                <div className="aspect-[9/16] max-w-[280px] mx-auto bg-navy rounded-3xl overflow-hidden border-4 border-white/30 shadow-2xl">
                  <div className="h-full flex flex-col">
                    <div className="h-8 bg-white/10 flex items-center justify-center">
                      <div className="w-20 h-5 bg-white/20 rounded-full" />
                    </div>
                    <div className="flex-1 bg-navy p-4">
                      <div className="text-white text-sm font-bold mb-4">Driver Dashboard</div>
                      <div className="space-y-3">
                        <div className="bg-white/15 rounded-lg p-3">
                          <div className="text-xs text-white/80">Current Load</div>
                          <div className="text-sm font-bold text-white">SEA → LAX</div>
                        </div>
                        <div className="bg-white/15 rounded-lg p-3">
                          <div className="text-xs text-white/80">This Week</div>
                          <div className="text-sm font-bold text-green-400">$3,245</div>
                        </div>
                        <div className="bg-white/15 rounded-lg p-3">
                          <div className="text-xs text-white/80">Drive Time</div>
                          <div className="text-sm font-bold text-orange">6:45 remaining</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-slate-50">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
              Why Drivers Love Our Portal
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Join hundreds of Thind Transport drivers who use our portal daily to manage their careers
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <BenefitCard 
              icon={<Zap className="h-8 w-8" />}
              title="Save 5+ Hours Weekly"
              description="No more phone calls for load info or settlement questions. Everything's at your fingertips."
            />
            <BenefitCard 
              icon={<Eye className="h-8 w-8" />}
              title="Full Transparency"
              description="See exactly how your pay is calculated with detailed settlement breakdowns."
            />
            <BenefitCard 
              icon={<Download className="h-8 w-8" />}
              title="Instant Downloads"
              description="Download pay stubs, 1099s, and compliance documents anytime you need them."
            />
            <BenefitCard 
              icon={<Headphones className="h-8 w-8" />}
              title="24/7 Support Access"
              description="Get help when you need it with built-in messaging and support ticket system."
            />
          </div>
        </div>
      </section>

      {/* Driver Testimonials */}
      <section className="py-20 bg-white">
        <div className="container">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-orange-100 text-orange-700 px-4 py-1.5 text-xs font-bold">
              DRIVER FEEDBACK
            </Badge>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
              What Our Drivers Say
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <TestimonialCard 
              quote="The portal changed everything for me. I can check my settlements instantly instead of waiting for phone calls. Saves me hours every week."
              name="Robert M."
              role="Owner Operator"
              years="3 years with Thind"
              rating={5}
            />
            <TestimonialCard 
              quote="Being able to upload my documents from my phone is a game changer. No more stopping at truck stops to fax paperwork."
              name="Marcus T."
              role="Company Driver"
              years="2 years with Thind"
              rating={5}
            />
            <TestimonialCard 
              quote="I love seeing my earnings in real-time. The fuel card balance feature helps me plan my stops better. Great tool."
              name="James W."
              role="Owner Operator"
              years="4 years with Thind"
              rating={5}
            />
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-slate-50">
        <div className="container max-w-4xl">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-blue-100 text-blue-700 px-4 py-1.5 text-xs font-bold">
              FAQ
            </Badge>
            <h2 className="text-4xl font-black text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-gray-600">
              Everything you need to know about the Thind Transport Driver Portal
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                question: "How do I get access to the driver portal?",
                answer: "All active Thind Transport drivers receive portal access automatically. Your login credentials are provided during orientation. If you're a new driver, you'll receive your credentials within 24 hours of completing your onboarding paperwork."
              },
              {
                question: "Can I access the portal from my phone?",
                answer: "Yes! Our portal is fully mobile-optimized and works on any smartphone, tablet, or computer. Simply visit the portal URL in your mobile browser to access all features. We recommend bookmarking the page for quick access."
              },
              {
                question: "How quickly are settlements posted to the portal?",
                answer: "Settlements are typically posted within 24 hours of your pay period ending. You'll receive a notification when your new settlement is available. You can view the full breakdown and download PDFs immediately."
              },
              {
                question: "What documents can I access through the portal?",
                answer: "You can access and download all your documents including: weekly settlements, 1099 tax forms, rate confirmations, lease agreements, insurance certificates, and compliance documents. You can also upload new documents like your CDL, medical card, and vehicle registrations."
              },
              {
                question: "What if I forget my password?",
                answer: "Click the 'Forgot password?' link on the login page. You'll receive a password reset email within minutes. If you don't receive it, check your spam folder or contact dispatch for assistance."
              },
              {
                question: "Is my information secure?",
                answer: "Absolutely. We use bank-level 256-bit SSL encryption to protect all data. Your personal and financial information is never shared with third parties. We follow industry best practices for data security and privacy."
              }
            ].map((faq, index) => (
              <Card 
                key={index}
                className={`overflow-hidden transition-all duration-200 border-gray-200 ${expandedFaq === index ? 'shadow-lg' : 'hover:shadow-md'}`}
              >
                <button
                  className="w-full p-6 text-left flex items-center justify-between gap-4"
                  onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                >
                  <h3 className="font-bold text-gray-900 text-lg">{faq.question}</h3>
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${expandedFaq === index ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {expandedFaq === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="px-6 pb-6">
                        <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-navy text-white">
        <div className="container text-center">
          <h2 className="text-4xl md:text-5xl font-black mb-6 text-white">
            Ready to Take Control of Your Career?
          </h2>
          <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto leading-relaxed">
            Join the Thind Transport team and get instant access to our powerful driver portal along with industry-leading pay and benefits.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              asChild
              size="lg"
              className="bg-orange hover:bg-orange-600 text-white font-bold text-lg px-8 py-6 shadow-cta"
            >
              <Link href="/apply">
                Apply Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button 
              asChild
              size="lg"
              className="border-2 border-white/80 text-white hover:bg-white/30 font-bold text-lg px-8 py-6 bg-white/15 backdrop-blur-sm"
            >
              <Link href="/pay-rates" className="text-white">
                View Pay Rates
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}

// ===========================================
// FEATURE CARD COMPONENT
// ===========================================

function FeatureCard({ 
  icon, 
  title, 
  description,
  highlights,
  color 
}: { 
  icon: React.ReactNode
  title: string
  description: string
  highlights: string[]
  color: string
}) {
  const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
    blue: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-100" },
    green: { bg: "bg-green-50", text: "text-green-600", border: "border-green-100" },
    purple: { bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-100" },
    orange: { bg: "bg-orange-50", text: "text-orange-600", border: "border-orange-100" },
    red: { bg: "bg-red-50", text: "text-red-600", border: "border-red-100" },
    indigo: { bg: "bg-indigo-50", text: "text-indigo-600", border: "border-indigo-100" },
  }

  const colors = colorClasses[color]

  return (
    <Card className={`p-6 hover:shadow-xl transition-all duration-300 border-2 ${colors.border} group`}>
      <div className={`w-14 h-14 rounded-2xl ${colors.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
        <div className={colors.text}>{icon}</div>
      </div>
      <h3 className="font-black text-gray-900 mb-2 text-xl">{title}</h3>
      <p className="text-gray-600 mb-4 leading-relaxed">{description}</p>
      <ul className="space-y-2">
        {highlights.map((highlight, index) => (
          <li key={index} className="flex items-center gap-2 text-sm text-gray-700">
            <CheckCircle className={`w-4 h-4 ${colors.text}`} />
            {highlight}
          </li>
        ))}
      </ul>
    </Card>
  )
}

// ===========================================
// BENEFIT CARD COMPONENT
// ===========================================

function BenefitCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="text-center p-6">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#001F3F] to-[#003366] flex items-center justify-center mx-auto mb-4 text-white">
        {icon}
      </div>
      <h3 className="font-bold text-gray-900 mb-2 text-lg">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
  )
}

// ===========================================
// TESTIMONIAL CARD COMPONENT
// ===========================================

function TestimonialCard({ quote, name, role, years, rating }: { quote: string; name: string; role: string; years: string; rating: number }) {
  return (
    <Card className="p-6 hover:shadow-xl transition-all duration-300 border-gray-100">
      <div className="flex gap-1 mb-4">
        {[...Array(rating)].map((_, i) => (
          <Star key={i} className="w-5 h-5 fill-orange-400 text-orange-400" />
        ))}
      </div>
      <blockquote className="text-gray-700 mb-6 leading-relaxed italic">
        &ldquo;{quote}&rdquo;
      </blockquote>
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#001F3F] to-[#003366] flex items-center justify-center text-white font-bold">
          {name.split(' ').map(n => n[0]).join('')}
        </div>
        <div>
          <p className="font-bold text-gray-900">{name}</p>
          <p className="text-sm text-gray-500">{role} • {years}</p>
        </div>
      </div>
    </Card>
  )
}

// ===========================================
// DRIVER DASHBOARD COMPONENT
// ===========================================

function DriverDashboard({ 
  driver, 
  currentLoad, 
  recentSettlements,
  activeTab,
  setActiveTab,
  onLogout 
}: { 
  driver: DriverProfile
  currentLoad: LoadData
  recentSettlements: SettlementData[]
  activeTab: "dashboard" | "loads" | "settlements" | "documents" | "messages"
  setActiveTab: (tab: "dashboard" | "loads" | "settlements" | "documents" | "messages") => void
  onLogout: () => void
}) {
  return (
    <div className="min-h-screen bg-slate-100">
      {/* Dashboard Header */}
      <header className="bg-gradient-to-r from-[#001F3F] to-[#003366] text-white shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-xl font-black">THIND</Link>
              <div className="hidden md:block text-sm">
                <span className="text-white/80">Welcome back,</span>{" "}
                <span className="font-bold">{driver.firstName}</span>
              </div>
            </div>
            
            <nav className="hidden lg:flex items-center gap-1 bg-white/10 rounded-full p-1">
              <NavButton active={activeTab === "dashboard"} onClick={() => setActiveTab("dashboard")}>
                <Activity className="w-4 h-4" />
                <span>Dashboard</span>
              </NavButton>
              <NavButton active={activeTab === "loads"} onClick={() => setActiveTab("loads")}>
                <Package className="w-4 h-4" />
                <span>Loads</span>
              </NavButton>
              <NavButton active={activeTab === "settlements"} onClick={() => setActiveTab("settlements")}>
                <DollarSign className="w-4 h-4" />
                <span>Pay</span>
              </NavButton>
              <NavButton active={activeTab === "documents"} onClick={() => setActiveTab("documents")}>
                <FileText className="w-4 h-4" />
                <span>Documents</span>
              </NavButton>
              <NavButton active={activeTab === "messages"} onClick={() => setActiveTab("messages")}>
                <MessageSquare className="w-4 h-4" />
                <span>Messages</span>
              </NavButton>
            </nav>

            <div className="flex items-center gap-3">
              <button className="relative p-2 hover:bg-white/10 rounded-lg transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <button 
                onClick={onLogout}
                className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden md:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
        
        <div className="lg:hidden border-t border-white/10 overflow-x-auto">
          <nav className="flex px-4 py-2 gap-2">
            <MobileNavButton active={activeTab === "dashboard"} onClick={() => setActiveTab("dashboard")} icon={<Activity className="w-4 h-4" />} label="Dashboard" />
            <MobileNavButton active={activeTab === "loads"} onClick={() => setActiveTab("loads")} icon={<Package className="w-4 h-4" />} label="Loads" />
            <MobileNavButton active={activeTab === "settlements"} onClick={() => setActiveTab("settlements")} icon={<DollarSign className="w-4 h-4" />} label="Pay" />
            <MobileNavButton active={activeTab === "documents"} onClick={() => setActiveTab("documents")} icon={<FileText className="w-4 h-4" />} label="Docs" />
            <MobileNavButton active={activeTab === "messages"} onClick={() => setActiveTab("messages")} icon={<MessageSquare className="w-4 h-4" />} label="Messages" />
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "dashboard" && <DashboardTab driver={driver} currentLoad={currentLoad} recentSettlements={recentSettlements} />}
            {activeTab === "loads" && <LoadsTab currentLoad={currentLoad} />}
            {activeTab === "settlements" && <SettlementsTab settlements={recentSettlements} />}
            {activeTab === "documents" && <DocumentsTab />}
            {activeTab === "messages" && <MessagesTab />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}

// Navigation Components
function NavButton({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
        active ? "bg-white text-[#001F3F]" : "text-white/70 hover:text-white hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  )
}

function MobileNavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
        active ? "bg-white text-[#001F3F]" : "text-white/70 hover:bg-white/10"
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

// Dashboard Tab Components
function DashboardTab({ driver, currentLoad, recentSettlements }: { driver: DriverProfile; currentLoad: LoadData; recentSettlements: SettlementData[] }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<TruckIcon className="w-5 h-5" />} label="Assigned Truck" value={driver.truckId} color="blue" />
        <StatCard icon={<Gauge className="w-5 h-5" />} label="Safety Score" value={`${driver.safetyScore}%`} color="green" />
        <StatCard icon={<Clock className="w-5 h-5" />} label="Drive Time Left" value="6:45" subtext="hours today" color="orange" />
        <StatCard icon={<DollarSign className="w-5 h-5" />} label="This Week" value="$3,245" subtext="estimated" color="purple" />
      </div>

      <Card className="p-6 shadow-lg border-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            Current Load
          </h2>
          <Badge className="bg-blue-100 text-blue-700">{currentLoad.status.replace('_', ' ').toUpperCase()}</Badge>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold text-sm">P</div>
              <div>
                <p className="text-sm text-gray-500">Pickup</p>
                <p className="font-bold text-gray-900">{currentLoad.pickupCity}, {currentLoad.pickupState}</p>
                <p className="text-sm text-gray-600">{currentLoad.pickupDate}</p>
              </div>
            </div>
            <div className="ml-4 border-l-2 border-dashed border-gray-300 h-8"></div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-sm">D</div>
              <div>
                <p className="text-sm text-gray-500">Delivery</p>
                <p className="font-bold text-gray-900">{currentLoad.deliveryCity}, {currentLoad.deliveryState}</p>
                <p className="text-sm text-gray-600">{currentLoad.deliveryDate}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-slate-50 rounded-xl p-4 space-y-3">
            <div className="flex justify-between"><span className="text-gray-600">Load #</span><span className="font-bold text-gray-900">{currentLoad.loadNumber}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Miles</span><span className="font-bold text-gray-900">{currentLoad.miles.toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Rate</span><span className="font-bold text-green-600">${currentLoad.rate.toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Commodity</span><span className="font-medium text-gray-900">{currentLoad.commodity}</span></div>
            <div className="pt-2 border-t">
              <Button className="w-full bg-blue-600 hover:bg-blue-700"><Navigation className="w-4 h-4 mr-2" />Navigate to Delivery</Button>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6 shadow-lg border-0">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4"><Timer className="w-5 h-5 text-orange-600" />Hours of Service</h2>
          <div className="space-y-4">
            <HOSBar label="Drive Time" current={6.75} max={11} color="blue" />
            <HOSBar label="On-Duty" current={10} max={14} color="orange" />
            <HOSBar label="Weekly (70hr)" current={48} max={70} color="purple" />
          </div>
          <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm text-green-800 flex items-center gap-2"><CheckCircle className="w-4 h-4" />You are in compliance with all HOS regulations</p>
          </div>
        </Card>

        <Card className="p-6 shadow-lg border-0">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4"><DollarSign className="w-5 h-5 text-green-600" />Recent Settlements</h2>
          <div className="space-y-3">
            {recentSettlements.map((settlement) => (
              <div key={settlement.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div><p className="font-bold text-gray-900">{settlement.settlementNumber}</p><p className="text-sm text-gray-500">Week ending {settlement.periodEnd}</p></div>
                <div className="text-right"><p className="font-bold text-green-600">${settlement.netPay.toLocaleString()}</p><Badge className="bg-green-100 text-green-700 text-xs">{settlement.status}</Badge></div>
              </div>
            ))}
          </div>
          <Button variant="outline" className="w-full mt-4">View All Settlements<ArrowRight className="w-4 h-4 ml-2" /></Button>
        </Card>
      </div>

      <Card className="p-6 shadow-lg border-0 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4"><AlertTriangle className="w-5 h-5 text-amber-600" />Compliance Reminders</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="p-4 bg-white rounded-lg border border-amber-200"><div className="flex items-center gap-2 text-amber-700 font-medium mb-1"><FileText className="w-4 h-4" />Medical Card</div><p className="text-sm text-gray-600">Expires in 45 days</p></div>
          <div className="p-4 bg-white rounded-lg border border-green-200"><div className="flex items-center gap-2 text-green-700 font-medium mb-1"><CheckCircle className="w-4 h-4" />CDL</div><p className="text-sm text-gray-600">Valid until 2026</p></div>
          <div className="p-4 bg-white rounded-lg border border-green-200"><div className="flex items-center gap-2 text-green-700 font-medium mb-1"><CheckCircle className="w-4 h-4" />Annual Inspection</div><p className="text-sm text-gray-600">Completed 2024-09-15</p></div>
        </div>
      </Card>
    </div>
  )
}

function LoadsTab({ currentLoad }: { currentLoad: LoadData }) {
  const availableLoads = [
    { id: "A1", origin: "Portland, OR", destination: "Phoenix, AZ", miles: 1420, rate: 4260, pickupDate: "Dec 5" },
    { id: "A2", origin: "Sacramento, CA", destination: "Denver, CO", miles: 1225, rate: 3675, pickupDate: "Dec 6" },
    { id: "A3", origin: "Las Vegas, NV", destination: "Dallas, TX", miles: 1230, rate: 3444, pickupDate: "Dec 6" },
  ]

  return (
    <div className="space-y-6">
      <Card className="p-6 shadow-lg border-0">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Current Assignment</h2>
        <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
          <div className="flex items-center justify-between mb-3"><span className="font-bold text-lg">{currentLoad.loadNumber}</span><Badge className="bg-blue-600 text-white">{currentLoad.status.replace('_', ' ')}</Badge></div>
          <div className="grid md:grid-cols-4 gap-4 text-sm">
            <div><p className="text-gray-500">Route</p><p className="font-bold">{currentLoad.pickupCity} → {currentLoad.deliveryCity}</p></div>
            <div><p className="text-gray-500">Miles</p><p className="font-bold">{currentLoad.miles}</p></div>
            <div><p className="text-gray-500">Rate</p><p className="font-bold text-green-600">${currentLoad.rate}</p></div>
            <div><p className="text-gray-500">Delivery</p><p className="font-bold">{currentLoad.deliveryDate}</p></div>
          </div>
        </div>
      </Card>

      <Card className="p-6 shadow-lg border-0">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Available Loads</h2>
        <div className="space-y-3">
          {availableLoads.map((load) => (
            <div key={load.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-blue-300 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex-1"><p className="font-bold text-gray-900">{load.origin} → {load.destination}</p><div className="flex gap-4 mt-1 text-sm text-gray-600"><span>{load.miles} miles</span><span>Pickup: {load.pickupDate}</span></div></div>
                <div className="text-right"><p className="font-bold text-xl text-green-600">${load.rate}</p><p className="text-sm text-gray-500">${(load.rate / load.miles).toFixed(2)}/mi</p></div>
                <Button className="ml-4 bg-blue-600 hover:bg-blue-700">Accept</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function SettlementsTab({ settlements }: { settlements: SettlementData[] }) {
  const ytdStats = { gross: 156780, net: 141102, miles: 52890, loads: 142 }

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-green-500 to-emerald-600 text-white"><p className="text-green-100 text-sm">YTD Gross</p><p className="text-2xl font-bold">${ytdStats.gross.toLocaleString()}</p></Card>
        <Card className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 text-white"><p className="text-blue-100 text-sm">YTD Net</p><p className="text-2xl font-bold">${ytdStats.net.toLocaleString()}</p></Card>
        <Card className="p-4 bg-gradient-to-br from-purple-500 to-purple-600 text-white"><p className="text-purple-100 text-sm">YTD Miles</p><p className="text-2xl font-bold">{ytdStats.miles.toLocaleString()}</p></Card>
        <Card className="p-4 bg-gradient-to-br from-orange-500 to-orange-600 text-white"><p className="text-orange-100 text-sm">YTD Loads</p><p className="text-2xl font-bold">{ytdStats.loads}</p></Card>
      </div>

      <Card className="p-6 shadow-lg border-0">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Settlement History</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b text-left"><th className="pb-3 font-semibold text-gray-600">Period</th><th className="pb-3 font-semibold text-gray-600">Gross</th><th className="pb-3 font-semibold text-gray-600">Deductions</th><th className="pb-3 font-semibold text-gray-600">Net Pay</th><th className="pb-3 font-semibold text-gray-600">Status</th><th className="pb-3 font-semibold text-gray-600"></th></tr></thead>
            <tbody className="divide-y">
              {settlements.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="py-4"><p className="font-bold">{s.settlementNumber}</p><p className="text-sm text-gray-500">Week ending {s.periodEnd}</p></td>
                  <td className="py-4">${s.grossPay.toLocaleString()}</td>
                  <td className="py-4 text-red-600">-${(s.grossPay - s.netPay).toLocaleString()}</td>
                  <td className="py-4 font-bold text-green-600">${s.netPay.toLocaleString()}</td>
                  <td className="py-4"><Badge className="bg-green-100 text-green-700">{s.status}</Badge></td>
                  <td className="py-4"><Button variant="outline" size="sm">Download PDF</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function DocumentsTab() {
  const documents = [
    { name: "CDL - Front", type: "cdl_front", status: "approved", expiration: "2026-08-15" },
    { name: "CDL - Back", type: "cdl_back", status: "approved", expiration: "2026-08-15" },
    { name: "Medical Card", type: "medical_card", status: "approved", expiration: "2025-01-20" },
    { name: "W-9 Form", type: "w9", status: "approved", expiration: null },
    { name: "Lease Agreement", type: "contract", status: "approved", expiration: null },
  ]

  return (
    <div className="space-y-6">
      <Card className="p-6 shadow-lg border-0">
        <div className="flex items-center justify-between mb-4"><h2 className="text-xl font-bold text-gray-900">My Documents</h2><Button className="bg-blue-600 hover:bg-blue-700"><FileText className="w-4 h-4 mr-2" />Upload Document</Button></div>
        <div className="grid gap-3">
          {documents.map((doc, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
              <div className="flex items-center gap-3"><div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center"><FileText className="w-5 h-5 text-blue-600" /></div><div><p className="font-bold text-gray-900">{doc.name}</p>{doc.expiration && <p className="text-sm text-gray-500">Expires: {doc.expiration}</p>}</div></div>
              <div className="flex items-center gap-3"><Badge className="bg-green-100 text-green-700">{doc.status}</Badge><Button variant="outline" size="sm">View</Button></div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function MessagesTab() {
  const messages = [
    { from: "Dispatch", subject: "Load TT-78234 Update", time: "2 hours ago", unread: true },
    { from: "Safety Dept", subject: "Monthly Safety Reminder", time: "1 day ago", unread: false },
    { from: "Accounting", subject: "Settlement 2024-W47 Processed", time: "2 days ago", unread: false },
  ]

  return (
    <div className="space-y-6">
      <Card className="p-6 shadow-lg border-0">
        <div className="flex items-center justify-between mb-4"><h2 className="text-xl font-bold text-gray-900">Messages</h2><Button className="bg-blue-600 hover:bg-blue-700"><MessageSquare className="w-4 h-4 mr-2" />New Message</Button></div>
        <div className="space-y-2">
          {messages.map((msg, i) => (
            <div key={i} className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer hover:bg-slate-50 transition-colors ${msg.unread ? 'bg-blue-50 border-blue-200' : 'bg-white'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${msg.unread ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}><User className="w-5 h-5" /></div>
                <div><p className={`font-bold ${msg.unread ? 'text-blue-900' : 'text-gray-900'}`}>{msg.from}</p><p className="text-sm text-gray-600">{msg.subject}</p></div>
              </div>
              <div className="text-right"><p className="text-sm text-gray-500">{msg.time}</p>{msg.unread && <span className="inline-block w-2 h-2 bg-blue-600 rounded-full mt-1"></span>}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

// Helper Components
function StatCard({ icon, label, value, subtext, color }: { icon: React.ReactNode; label: string; value: string; subtext?: string; color: string }) {
  const colors: Record<string, string> = { blue: "from-blue-500 to-blue-600", green: "from-green-500 to-emerald-600", orange: "from-orange-500 to-orange-600", purple: "from-purple-500 to-purple-600" }
  return (
    <Card className={`p-4 bg-gradient-to-br ${colors[color]} text-white shadow-lg border-0`}>
      <div className="flex items-center gap-2 mb-2 opacity-80">{icon}<span className="text-sm">{label}</span></div>
      <p className="text-2xl font-bold">{value}</p>
      {subtext && <p className="text-sm opacity-70">{subtext}</p>}
    </Card>
  )
}

function HOSBar({ label, current, max, color }: { label: string; current: number; max: number; color: string }) {
  const percentage = (current / max) * 100
  const colors: Record<string, string> = { blue: "bg-blue-500", orange: "bg-orange-500", purple: "bg-purple-500" }
  return (
    <div>
      <div className="flex justify-between text-sm mb-1"><span className="text-gray-600">{label}</span><span className="font-bold">{current}h / {max}h</span></div>
      <div className="h-3 bg-slate-200 rounded-full overflow-hidden"><div className={`h-full ${colors[color]} rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }} /></div>
    </div>
  )
}
