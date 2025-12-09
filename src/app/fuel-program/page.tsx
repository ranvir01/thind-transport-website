import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Fuel, TrendingDown, CreditCard, MapPin, 
  Shield, CheckCircle2, DollarSign, Percent,
  Phone, FileText, Star, Info
} from "lucide-react"
import { COMPANY_INFO } from "@/lib/constants"
import { PageBreadcrumb } from "@/components/shared/PageBreadcrumb"

export default function FuelProgramPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <PageBreadcrumb pageName="Fuel Program" category="Drivers" />
      
      {/* Enhanced Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-orange-600 via-red-600 to-orange-700 text-white py-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-yellow-400/10 via-transparent to-transparent" />
        
        {/* Decorative elements */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-yellow-400/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-red-400/10 rounded-full blur-3xl" />
        
        <div className="container relative">
          <div className="text-center max-w-4xl mx-auto">
            <Badge className="mb-6 bg-white/20 backdrop-blur-md text-white border-white/30 px-4 py-2 text-sm font-bold">
              <Fuel className="h-4 w-4 mr-1.5" />
              Exclusive Fuel Card Program
            </Badge>
            <h1 className="text-5xl md:text-6xl font-black mb-6 leading-tight">
              Save Big on <span className="text-yellow-300">Every Gallon</span>
            </h1>
            <p className="text-xl text-white/90 max-w-3xl mx-auto leading-relaxed">
              Our exclusive fuel card program helps drivers save hundreds per month with nationwide discounts at over 15,000 locations
            </p>
          </div>
        </div>
      </div>

      <div className="container py-16 -mt-10">
        {/* Key Benefits */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="p-8 text-center hover:shadow-2xl transition-all duration-300 border-gray-100 group hover:-translate-y-2">
            <div className="bg-gradient-to-br from-green-500/10 to-emerald-600/10 p-5 rounded-2xl inline-flex mb-6 group-hover:from-green-500/20 group-hover:to-emerald-600/20 transition-colors">
              <TrendingDown className="h-10 w-10 text-green-600" />
            </div>
            <h3 className="text-3xl font-black text-gray-900 mb-3">Up to 50¢/gal</h3>
            <p className="text-gray-600 leading-relaxed">Average savings at major truck stops nationwide</p>
          </Card>
          
          <Card className="p-8 text-center hover:shadow-2xl transition-all duration-300 border-gray-100 group hover:-translate-y-2">
            <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 p-5 rounded-2xl inline-flex mb-6 group-hover:from-blue-500/20 group-hover:to-blue-600/20 transition-colors">
              <MapPin className="h-10 w-10 text-blue-600" />
            </div>
            <h3 className="text-3xl font-black text-gray-900 mb-3">15,000+ Locations</h3>
            <p className="text-gray-600 leading-relaxed">Accepted at all major truck stops and fuel stations</p>
          </Card>
          
          <Card className="p-8 text-center hover:shadow-2xl transition-all duration-300 border-gray-100 group hover:-translate-y-2">
            <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 p-5 rounded-2xl inline-flex mb-6 group-hover:from-purple-500/20 group-hover:to-purple-600/20 transition-colors">
              <CreditCard className="h-10 w-10 text-purple-600" />
            </div>
            <h3 className="text-3xl font-black text-gray-900 mb-3">No Fees</h3>
            <p className="text-gray-600 leading-relaxed">Zero transaction fees or hidden charges</p>
          </Card>
        </div>

        {/* Program Details */}
        <div className="grid lg:grid-cols-2 gap-8 mb-16">
          <Card className="p-8 shadow-xl border-gray-100 hover:shadow-2xl transition-shadow duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/10 to-red-600/10 flex items-center justify-center">
                <Fuel className="h-6 w-6 text-orange-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Program Features</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors">
                <CheckCircle2 className="h-6 w-6 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-gray-900 text-lg">Real-Time Price Optimization</h4>
                  <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                    Our app shows you the best fuel prices along your route in real-time
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors">
                <CheckCircle2 className="h-6 w-6 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-gray-900 text-lg">Weekly Direct Deposit</h4>
                  <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                    Fuel advances available with settlements every Friday
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors">
                <CheckCircle2 className="h-6 w-6 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-gray-900 text-lg">24/7 Support</h4>
                  <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                    Lost card? Need help? We're available around the clock
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors">
                <CheckCircle2 className="h-6 w-6 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-gray-900 text-lg">Detailed Reporting</h4>
                  <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                    Track fuel expenses, MPG, and generate IFTA reports easily
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors">
                <CheckCircle2 className="h-6 w-6 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-gray-900 text-lg">Partner Perks</h4>
                  <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                    Additional discounts on tires, maintenance, and truck washes
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <div>
            {/* Savings Calculator */}
            <Card className="p-8 bg-gradient-to-br from-green-50 via-emerald-50 to-blue-50 border-2 border-green-200 mb-6 shadow-xl hover:shadow-2xl transition-shadow duration-300">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                <DollarSign className="inline h-5 w-5 text-green-600 mr-1" />
                Your Potential Savings
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 rounded-lg hover:bg-green-50 transition-colors">
                  <span className="text-gray-600 font-medium">Average weekly gallons:</span>
                  <span className="font-bold text-lg">500 gal</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg hover:bg-green-50 transition-colors">
                  <span className="text-gray-600 font-medium">Average discount:</span>
                  <span className="font-bold text-green-600 text-lg">$0.40/gal</span>
                </div>
                <div className="h-px bg-gray-300 my-3"></div>
                <div className="flex justify-between items-center text-lg p-3 rounded-lg hover:bg-green-50 transition-colors">
                  <span className="font-bold">Weekly savings:</span>
                  <span className="font-black text-green-600 text-xl">$200</span>
                </div>
                <div className="flex justify-between items-center text-xl bg-green-100 p-3 rounded-lg -mx-2">
                  <span className="font-semibold">Annual savings:</span>
                  <span className="font-black text-green-700 text-2xl">$10,400</span>
                </div>
              </div>
              <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-xs text-amber-800 font-medium">
                  <Info className="inline h-3 w-3 mr-1" />
                  Based on average driver consumption. Your savings may vary.
                </p>
              </div>
            </Card>

            {/* Network Partners */}
            <Card className="p-6 shadow-xl border-gray-100 hover:shadow-2xl transition-shadow duration-300">
              <h3 className="font-bold text-gray-900 mb-4 text-lg">Accepted Nationwide At:</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  "Pilot Flying J",
                  "Love's Travel Stops",
                  "TA-Petro",
                  "Speedway",
                  "Casey's",
                  "Kwik Trip",
                  "Circle K",
                  "Shell",
                  "And 15,000+ more locations"
                ].map((partner, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span>{partner}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        {/* How It Works */}
        <Card className="p-10 mb-16 shadow-xl border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white w-16 h-16 rounded-2xl flex items-center justify-center font-black text-xl mx-auto mb-4 shadow-lg">
                1
              </div>
              <h4 className="font-bold mb-2 text-lg">Apply & Get Approved</h4>
              <p className="text-sm text-gray-600 leading-relaxed">Quick application process with instant approval</p>
            </div>
            <div className="text-center">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white w-16 h-16 rounded-2xl flex items-center justify-center font-black text-xl mx-auto mb-4 shadow-lg">
                2
              </div>
              <h4 className="font-bold mb-2 text-lg">Receive Your Card</h4>
              <p className="text-sm text-gray-600 leading-relaxed">Card arrives in 3-5 business days</p>
            </div>
            <div className="text-center">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white w-16 h-16 rounded-2xl flex items-center justify-center font-black text-xl mx-auto mb-4 shadow-lg">
                3
              </div>
              <h4 className="font-bold mb-2 text-lg">Start Saving</h4>
              <p className="text-sm text-gray-600 leading-relaxed">Use at any participating location</p>
            </div>
            <div className="text-center">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white w-16 h-16 rounded-2xl flex items-center justify-center font-black text-xl mx-auto mb-4 shadow-lg">
                4
              </div>
              <h4 className="font-bold mb-2 text-lg">Track Savings</h4>
              <p className="text-sm text-gray-600 leading-relaxed">Monitor discounts in real-time</p>
            </div>
          </div>
        </Card>

        {/* Testimonial */}
        <Card className="p-10 mb-16 bg-gradient-to-br from-slate-50 via-gray-50 to-slate-50 shadow-xl border-gray-100">
          <div className="max-w-3xl mx-auto text-center">
            <div className="flex justify-center mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} className="h-5 w-5 text-yellow-500 fill-current" />
              ))}
            </div>
            <p className="text-lg text-gray-700 italic mb-4">
              "The fuel card program alone saves me over $800 per month. Combined with the high commission rates,
              Thind Transport really looks out for their drivers' bottom line."
            </p>
            <p className="font-semibold text-gray-900">- Mike Johnson, Owner Operator</p>
            <p className="text-sm text-gray-600">Driving with Thind since 2019</p>
          </div>
        </Card>

        {/* CTA Section */}
        <Card className="p-10 bg-gradient-to-br from-orange-600 via-red-600 to-orange-700 text-white text-center shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-yellow-400/10 via-transparent to-transparent" />
          <div className="relative">
          <h2 className="text-3xl font-bold mb-4">
            Start Saving on Fuel Today
          </h2>
          <p className="text-lg mb-6 text-white/90 max-w-2xl mx-auto">
            Join our fleet and get instant access to our fuel card program. 
            No credit checks for company drivers!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
            <Button size="lg" className="bg-white text-orange-600 hover:bg-gray-100" asChild>
              <Link href="/apply">
                <FileText className="h-5 w-5 mr-2" />
                Apply Now
              </Link>
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-white text-white hover:bg-white/10" 
              asChild
            >
              <Link href={`tel:${COMPANY_INFO.phoneFormatted}`}>
                <Phone className="h-5 w-5 mr-2" />
                Call {COMPANY_INFO.phone}
              </Link>
            </Button>
          </div>
          <div className="flex items-center justify-center gap-6 text-sm text-white/95">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span>Secure & Reliable</span>
            </div>
            <div className="flex items-center gap-2">
              <Percent className="h-4 w-4" />
              <span>No Hidden Fees</span>
            </div>
          </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
