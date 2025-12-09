import { Metadata } from "next"
import { TestimonialsCarousel } from "@/components/shared/TestimonialsCarousel"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { COMPANY_INFO } from "@/lib/constants"
import { PageBreadcrumb } from "@/components/shared/PageBreadcrumb"
import { Star, Users, Trophy, TrendingUp, Heart, ArrowRight, Quote, ThumbsUp } from "lucide-react"

export const metadata: Metadata = {
  title: `Driver Reviews & Testimonials | ${COMPANY_INFO.name}`,
  description: "Read real reviews from CDL drivers at Thind Transport. See what company drivers and owner operators say about working with us in Kent, WA.",
}

export default function TestimonialsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <PageBreadcrumb pageName="Testimonials" category="Drivers" />
      
      {/* Enhanced Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 text-white py-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-yellow-400/10 via-transparent to-transparent" />
        
        {/* Decorative elements */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-yellow-400/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl" />
        
        <div className="container relative">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-6 bg-white/20 backdrop-blur-md text-white border-white/30 px-5 py-2.5 text-sm font-bold shadow-lg">
              <Star className="h-4 w-4 mr-1.5 fill-yellow-300 text-yellow-300" />
              4.8/5 Average Rating
            </Badge>
            <h1 className="text-5xl md:text-6xl font-black mb-6 leading-tight">
              Real Stories from <span className="text-yellow-300">Real Drivers</span>
            </h1>
            <p className="text-xl text-white/90 mb-8 max-w-3xl mx-auto leading-relaxed">
              Hear directly from the professionals who drive with us every day
            </p>
            
            {/* Overall Rating */}
            <div className="inline-flex items-center gap-6 bg-white/10 backdrop-blur-md rounded-2xl px-8 py-6 border border-white/20 shadow-2xl">
              <div className="flex text-yellow-300">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-8 h-8 fill-current drop-shadow-lg" />
                ))}
              </div>
              <div className="text-left">
                <div className="text-3xl font-black">4.8 out of 5</div>
                <div className="text-base text-white/95 font-medium">Based on 75+ driver reviews</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Carousel */}
      <section className="py-20 -mt-10">
        <div className="container">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-blue-100 text-blue-700 px-4 py-2 text-xs font-bold">
              Driver Testimonials
            </Badge>
            <h2 className="text-4xl font-black text-gray-900 mb-4">
              Hear It from Our Drivers
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Authentic experiences from company drivers and owner operators who've made Thind Transport their home
            </p>
          </div>
          <TestimonialsCarousel />
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gradient-to-b from-white via-gray-50/50 to-white">
        <div className="container">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <Badge className="mb-4 bg-green-100 text-green-700 px-4 py-2 text-xs font-bold">
                By the Numbers
              </Badge>
              <h2 className="text-4xl font-black text-gray-900">
                Why Drivers Choose Us
              </h2>
            </div>
            
            <div className="grid md:grid-cols-4 gap-8 mb-16">
              <Card className="p-8 text-center hover:shadow-2xl transition-all duration-300 border-gray-100 group hover:-translate-y-1">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:from-blue-500/20 group-hover:to-blue-600/20 transition-colors">
                  <ThumbsUp className="h-10 w-10 text-blue-600" />
                </div>
                <div className="text-5xl font-black bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent mb-2">92%</div>
                <p className="text-base font-semibold text-gray-700">Would Recommend</p>
              </Card>
              <Card className="p-8 text-center hover:shadow-2xl transition-all duration-300 border-gray-100 group hover:-translate-y-1">
                <div className="w-20 h-20 bg-gradient-to-br from-green-500/10 to-emerald-600/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:from-green-500/20 group-hover:to-emerald-600/20 transition-colors">
                  <Star className="h-10 w-10 text-green-600 fill-green-600" />
                </div>
                <div className="text-5xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-2">4.8</div>
                <p className="text-base font-semibold text-gray-700">Average Rating</p>
              </Card>
              <Card className="p-8 text-center hover:shadow-2xl transition-all duration-300 border-gray-100 group hover:-translate-y-1">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500/10 to-purple-600/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:from-purple-500/20 group-hover:to-purple-600/20 transition-colors">
                  <Users className="h-10 w-10 text-purple-600" />
                </div>
                <div className="text-5xl font-black bg-gradient-to-r from-purple-600 to-purple-700 bg-clip-text text-transparent mb-2">75+</div>
                <p className="text-base font-semibold text-gray-700">Total Reviews</p>
              </Card>
              <Card className="p-8 text-center hover:shadow-2xl transition-all duration-300 border-gray-100 group hover:-translate-y-1">
                <div className="w-20 h-20 bg-gradient-to-br from-red-500/10 to-red-600/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:from-red-500/20 group-hover:to-red-600/20 transition-colors">
                  <Trophy className="h-10 w-10 text-red-600" />
                </div>
                <div className="text-5xl font-black bg-gradient-to-r from-red-600 to-red-700 bg-clip-text text-transparent mb-2">5yrs</div>
                <p className="text-base font-semibold text-gray-700">Avg Tenure</p>
              </Card>
            </div>

            {/* Featured Review */}
            <Card className="mb-16 p-10 bg-gradient-to-br from-indigo-50 via-purple-50 to-indigo-50 border-2 border-indigo-200 shadow-xl relative overflow-hidden">
              <Quote className="absolute top-8 right-8 h-16 w-16 text-indigo-200 rotate-180" />
              <div className="relative">
                <div className="flex items-start gap-6 mb-6">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                    JD
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">John Davis</h3>
                    <p className="text-gray-600">Owner Operator • 5 Years with Thind</p>
                    <div className="flex text-yellow-500 mt-2">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-5 h-5 fill-current" />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-lg text-gray-700 leading-relaxed italic">
                  "After driving for mega carriers for 15 years, I finally found a company that treats drivers like family. 
                  The pay is transparent, dispatch knows me by name, and I'm actually home when they promise. 
                  Best decision I've made in my career."
                </p>
              </div>
            </Card>

            {/* Why Drivers Love Us */}
            <div className="mb-16">
              <h3 className="text-3xl font-black text-gray-900 text-center mb-10">
                What Makes Us Different
              </h3>
              <div className="grid md:grid-cols-3 gap-8">
                <Card className="p-8 hover:shadow-xl transition-all duration-300 border-gray-100 group hover:-translate-y-1">
                  <div className="w-14 h-14 bg-gradient-to-br from-green-500/10 to-emerald-600/10 rounded-xl flex items-center justify-center mb-4 group-hover:from-green-500/20 group-hover:to-emerald-600/20 transition-colors">
                    <Heart className="h-7 w-7 text-green-600" />
                  </div>
                  <h4 className="text-xl font-bold text-gray-900 mb-2">Family Culture</h4>
                  <p className="text-gray-600 leading-relaxed">
                    "They know my name, my kids' names, and actually care about my success. It's not just talk."
                  </p>
                </Card>
                <Card className="p-8 hover:shadow-xl transition-all duration-300 border-gray-100 group hover:-translate-y-1">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-xl flex items-center justify-center mb-4 group-hover:from-blue-500/20 group-hover:to-blue-600/20 transition-colors">
                    <TrendingUp className="h-7 w-7 text-blue-600" />
                  </div>
                  <h4 className="text-xl font-bold text-gray-900 mb-2">Top Tier Pay</h4>
                  <p className="text-gray-600 leading-relaxed">
                    "I'm making 30% more than my last job, and the pay is always on time. No games, no gimmicks."
                  </p>
                </Card>
                <Card className="p-8 hover:shadow-xl transition-all duration-300 border-gray-100 group hover:-translate-y-1">
                  <div className="w-14 h-14 bg-gradient-to-br from-purple-500/10 to-purple-600/10 rounded-xl flex items-center justify-center mb-4 group-hover:from-purple-500/20 group-hover:to-purple-600/20 transition-colors">
                    <Users className="h-7 w-7 text-purple-600" />
                  </div>
                  <h4 className="text-xl font-bold text-gray-900 mb-2">Professional Support</h4>
                  <p className="text-gray-600 leading-relaxed">
                    "24/7 dispatch that actually helps instead of just pushing freight. They work WITH you."
                  </p>
                </Card>
              </div>
            </div>

            {/* CTA */}
            <Card className="p-10 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white text-center relative overflow-hidden shadow-2xl">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/5 via-transparent to-transparent" />
              <div className="relative">
                <h3 className="text-4xl font-black mb-4 text-white">
                  Ready to Write Your Success Story?
                </h3>
                <p className="text-xl mb-8 text-white/90 max-w-2xl mx-auto">
                  Join the growing family of drivers who've found their home at Thind Transport
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button asChild size="lg" className="bg-white text-indigo-700 hover:bg-gray-100 font-bold text-lg h-14 px-10 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200">
                    <Link href="/apply">
                      Start Your Application
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-2 border-white/30 font-bold text-lg h-14 px-10 shadow-xl hover:shadow-2xl">
                    <Link href={`tel:${COMPANY_INFO.phoneFormatted}`}>
                      📞 Call {COMPANY_INFO.phone}
                    </Link>
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}

