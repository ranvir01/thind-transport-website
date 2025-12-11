"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Home, Globe, Clock, Map, User, DollarSign, Calendar } from "lucide-react"
import { motion } from "framer-motion"

export function RoutesSection() {
  return (
    <section className="relative py-12 sm:py-16 md:py-24 bg-[#020617] overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent opacity-50" />
      <div className="container relative px-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8 sm:mb-12 md:mb-16"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-900/30 px-4 py-1.5 sm:px-5 sm:py-2 text-xs sm:text-sm font-bold text-blue-400 mb-4 sm:mb-6 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
            <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Routes & Lanes
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white mb-3 sm:mb-6 leading-tight tracking-tight">
            Choose Your Schedule, Choose Your Life
          </h2>
          <p className="text-sm sm:text-base md:text-xl text-zinc-300 leading-relaxed max-w-3xl mx-auto font-medium">
            Flexible options to fit your lifestyle - from home every night to cross-country adventures
          </p>
        </motion.div>

        {/* Mobile: Horizontal Scroll, Tablet+: 3 columns */}
        <div className="flex md:grid md:grid-cols-3 gap-4 sm:gap-6 md:gap-8 overflow-x-auto md:overflow-visible snap-x snap-mandatory pb-6 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0 no-scrollbar">
          {/* Local Routes */}
          <motion.div
            className="min-w-[85vw] sm:min-w-[350px] md:min-w-0 snap-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <Card className="h-full group border border-white/10 bg-white/5 hover:bg-white/10 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 backdrop-blur-sm">
              <CardContent className="p-4 sm:p-6 md:p-8">
                <div className="text-center mb-4 sm:mb-6">
                  <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-blue-500/10 rounded-xl sm:rounded-2xl mb-3 sm:mb-4 shadow-inner border border-blue-500/20 group-hover:scale-110 transition-transform duration-300">
                    <Home className="h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10 text-blue-500" />
                  </div>
                  <Badge className="mb-2 sm:mb-3 bg-blue-500/20 text-blue-300 border-blue-500/30 font-bold text-xs">Home Every Night</Badge>
                  <h3 className="text-xl sm:text-2xl font-black mb-2 sm:mb-3 text-white">Local Routes</h3>
                  <div className="flex flex-col items-center gap-0.5 sm:gap-1 mb-2">
                    <span className="text-2xl sm:text-3xl font-black text-blue-400">$50K-$65K</span>
                    <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-blue-500/80">Target Annual Pay</span>
                  </div>
                  <div className="inline-block px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs font-bold text-blue-300">
                    $0.50 - $0.55 CPM
                  </div>
                </div>

                <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                  <div className="flex gap-2 sm:gap-3 text-left">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 border border-white/10">
                      <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="font-bold text-[10px] sm:text-xs text-zinc-300 uppercase tracking-wider mb-0.5">Schedule</p>
                      <p className="text-xs sm:text-sm text-zinc-200 font-medium">Home every night. Mon-Fri.</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 sm:gap-3 text-left">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 border border-white/10">
                      <Map className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="font-bold text-[10px] sm:text-xs text-zinc-300 uppercase tracking-wider mb-0.5">Coverage</p>
                      <p className="text-xs sm:text-sm text-zinc-200 font-medium">~200 mi radius of Kent, WA</p>
                    </div>
                  </div>

                  <div className="flex gap-2 sm:gap-3 text-left">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 border border-white/10">
                      <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="font-bold text-[10px] sm:text-xs text-zinc-300 uppercase tracking-wider mb-0.5">Best For</p>
                      <p className="text-xs sm:text-sm text-zinc-200 font-medium">Family time & routine</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/50 rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-blue-500/20">
                  <p className="text-xs sm:text-sm font-bold mb-2 sm:mb-3 text-blue-200">Typical Day:</p>
                  <ul className="text-xs sm:text-sm text-blue-100/80 space-y-1 sm:space-y-2 font-medium">
                    <li>• Start: 5am-7am</li>
                    <li>• 3-5 stops per day</li>
                    <li>• Home: 5pm-7pm</li>
                    <li>• Avg: 400-500 mi/day</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Regional Routes */}
          <motion.div
            className="min-w-[85vw] sm:min-w-[350px] md:min-w-0 snap-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <Card className="h-full group border border-green-500/20 bg-white/5 hover:bg-white/10 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 ring-1 ring-green-500/10 backdrop-blur-sm">
              <CardContent className="p-4 sm:p-6 md:p-8">
                <div className="text-center mb-4 sm:mb-6">
                  <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-green-500/10 rounded-xl sm:rounded-2xl mb-3 sm:mb-4 shadow-inner border border-green-500/20 group-hover:scale-110 transition-transform duration-300">
                    <MapPin className="h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10 text-green-500" />
                  </div>
                  <Badge className="mb-2 sm:mb-3 bg-green-500/20 text-green-300 border-green-500/30 font-bold text-xs">Home Weekly ⭐</Badge>
                  <h3 className="text-xl sm:text-2xl font-black mb-2 sm:mb-3 text-white">Regional Routes</h3>
                  <div className="flex flex-col items-center gap-0.5 sm:gap-1 mb-2">
                    <span className="text-2xl sm:text-3xl font-black text-green-400">$55K-$72K</span>
                    <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-green-500/80">Target Annual Pay</span>
                  </div>
                  <div className="inline-block px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-lg bg-green-500/10 border border-green-500/20 text-xs font-bold text-green-300">
                    $0.52 - $0.58 CPM
                  </div>
                </div>

                <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                  <div className="flex gap-2 sm:gap-3 text-left">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 border border-white/10">
                      <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-400" />
                    </div>
                    <div>
                      <p className="font-bold text-[10px] sm:text-xs text-zinc-300 uppercase tracking-wider mb-0.5">Schedule</p>
                      <p className="text-xs sm:text-sm text-zinc-200 font-medium">Home Weekly (Fri-Sun)</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 sm:gap-3 text-left">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 border border-white/10">
                      <Map className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-400" />
                    </div>
                    <div>
                      <p className="font-bold text-[10px] sm:text-xs text-zinc-300 uppercase tracking-wider mb-0.5">Coverage</p>
                      <p className="text-xs sm:text-sm text-zinc-200 font-medium">WA, OR, CA, ID, NV, AZ</p>
                    </div>
                  </div>

                  <div className="flex gap-2 sm:gap-3 text-left">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 border border-white/10">
                      <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-400" />
                    </div>
                    <div>
                      <p className="font-bold text-[10px] sm:text-xs text-zinc-300 uppercase tracking-wider mb-0.5">Best For</p>
                      <p className="text-xs sm:text-sm text-zinc-200 font-medium">Balanced pay & home time</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-900/50 to-green-800/50 rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-green-500/20">
                  <p className="text-xs sm:text-sm font-bold mb-2 sm:mb-3 text-green-200">Typical Week:</p>
                  <ul className="text-xs sm:text-sm text-green-100/80 space-y-1 sm:space-y-2 font-medium">
                    <li>• Mon-Fri: On the road</li>
                    <li>• 2,500-3,000 mi/week</li>
                    <li>• 3-4 loads per week</li>
                    <li>• Home Friday-Sunday</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* OTR Routes */}
          <motion.div
            className="min-w-[85vw] sm:min-w-[350px] md:min-w-0 snap-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
          >
            <Card className="h-full group border border-white/10 bg-white/5 hover:bg-white/10 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 backdrop-blur-sm">
              <CardContent className="p-4 sm:p-6 md:p-8">
                <div className="text-center mb-4 sm:mb-6">
                  <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-purple-500/10 rounded-xl sm:rounded-2xl mb-3 sm:mb-4 shadow-inner border border-purple-500/20 group-hover:scale-110 transition-transform duration-300">
                    <Globe className="h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10 text-purple-500" />
                  </div>
                  <Badge className="mb-2 sm:mb-3 bg-purple-500/20 text-purple-300 border-purple-500/30 font-bold text-xs">Highest Earnings 💰</Badge>
                  <h3 className="text-xl sm:text-2xl font-black mb-2 sm:mb-3 text-white">OTR Routes</h3>
                  <div className="flex flex-col items-center gap-0.5 sm:gap-1 mb-2">
                    <span className="text-2xl sm:text-3xl font-black text-purple-400">$65K-$280K</span>
                    <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-purple-500/80">Target Annual Pay</span>
                  </div>
                  <div className="inline-block px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-xs font-bold text-purple-300">
                    $0.55-$0.60 CPM / 91% O/O
                  </div>
                </div>

                <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                  <div className="flex gap-2 sm:gap-3 text-left">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 border border-white/10">
                      <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-400" />
                    </div>
                    <div>
                      <p className="font-bold text-[10px] sm:text-xs text-zinc-300 uppercase tracking-wider mb-0.5">Schedule</p>
                      <p className="text-xs sm:text-sm text-zinc-200 font-medium">2-3 Weeks Out, 3-4 Days Home</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 sm:gap-3 text-left">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 border border-white/10">
                      <Map className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-400" />
                    </div>
                    <div>
                      <p className="font-bold text-[10px] sm:text-xs text-zinc-300 uppercase tracking-wider mb-0.5">Coverage</p>
                      <p className="text-xs sm:text-sm text-zinc-200 font-medium">Nationwide (All 48 States)</p>
                    </div>
                  </div>

                  <div className="flex gap-2 sm:gap-3 text-left">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 border border-white/10">
                      <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-400" />
                    </div>
                    <div>
                      <p className="font-bold text-[10px] sm:text-xs text-zinc-300 uppercase tracking-wider mb-0.5">Best For</p>
                      <p className="text-xs sm:text-sm text-zinc-200 font-medium">Max earnings & O/Os</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-900/50 to-purple-800/50 rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-purple-500/20">
                  <p className="text-xs sm:text-sm font-bold mb-2 sm:mb-3 text-purple-200">Owner Operator Benefits:</p>
                  <ul className="text-xs sm:text-sm text-purple-100/80 space-y-1 sm:space-y-2 font-medium">
                    <li>• 91% of gross revenue</li>
                    <li>• Avg $2.25-$3.25/mile</li>
                    <li>• Pick your own loads</li>
                    <li>• $180K-$280K potential</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
