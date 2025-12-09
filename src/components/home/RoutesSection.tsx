"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Home, Globe, Clock, Map, User, DollarSign, Calendar } from "lucide-react"
import { motion } from "framer-motion"

export function RoutesSection() {
  return (
    <section className="relative py-24 bg-[#020617] overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent opacity-50" />
      <div className="container relative">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-900/30 px-5 py-2 text-sm font-bold text-blue-400 mb-6 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
            <MapPin className="h-4 w-4" />
            Routes & Lanes
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight tracking-tight">
            Choose Your Schedule, Choose Your Life
          </h2>
          <p className="text-xl text-zinc-300 leading-relaxed max-w-3xl mx-auto font-medium">
            Flexible options to fit your lifestyle - from home every night to cross-country adventures
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Local Routes */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <Card className="h-full group border border-white/10 bg-white/5 hover:bg-white/10 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 backdrop-blur-sm">
              <CardContent className="pt-8 p-8">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-500/10 rounded-2xl mb-4 shadow-inner border border-blue-500/20 group-hover:scale-110 transition-transform duration-300">
                    <Home className="h-10 w-10 text-blue-500" />
                  </div>
                  <Badge className="mb-3 bg-blue-500/20 text-blue-300 border-blue-500/30 font-bold">Home Every Night</Badge>
                  <h3 className="text-2xl font-black mb-3 text-white">Local Routes</h3>
                  <div className="flex flex-col items-center gap-1 mb-2">
                    <span className="text-3xl font-black text-blue-400">$50K-$65K</span>
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-500/80">Target Annual Pay</span>
                  </div>
                  <div className="inline-block px-3 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs font-bold text-blue-300">
                    $0.50 - $0.55 CPM
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex gap-3 text-left">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 border border-white/10">
                      <Clock className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="font-bold text-xs text-zinc-300 uppercase tracking-wider mb-0.5">Schedule</p>
                      <p className="text-sm text-zinc-200 font-medium">Home every night. Mon-Fri.</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3 text-left">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 border border-white/10">
                      <Map className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="font-bold text-xs text-zinc-300 uppercase tracking-wider mb-0.5">Coverage</p>
                      <p className="text-sm text-zinc-200 font-medium">~200 mi radius of Kent, WA</p>
                    </div>
                  </div>

                  <div className="flex gap-3 text-left">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 border border-white/10">
                      <User className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="font-bold text-xs text-zinc-300 uppercase tracking-wider mb-0.5">Best For</p>
                      <p className="text-sm text-zinc-200 font-medium">Family time & consistent routine</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/50 rounded-2xl p-5 border border-blue-500/20">
                  <p className="text-sm font-bold mb-3 text-blue-200">Typical Day:</p>
                  <ul className="text-sm text-blue-100/80 space-y-2 font-medium">
                    <li>• Start: 5am-7am</li>
                    <li>• 3-5 stops per day</li>
                    <li>• Home: 5pm-7pm</li>
                    <li>• Average: 400-500 miles/day</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Regional Routes */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <Card className="h-full group border border-green-500/20 bg-white/5 hover:bg-white/10 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 ring-1 ring-green-500/10 backdrop-blur-sm">
              <CardContent className="pt-8 p-8">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500/10 rounded-2xl mb-4 shadow-inner border border-green-500/20 group-hover:scale-110 transition-transform duration-300">
                    <MapPin className="h-10 w-10 text-green-500" />
                  </div>
                  <Badge className="mb-3 bg-green-500/20 text-green-300 border-green-500/30 font-bold">Home Weekly ⭐</Badge>
                  <h3 className="text-2xl font-black mb-3 text-white">Regional Routes</h3>
                  <div className="flex flex-col items-center gap-1 mb-2">
                    <span className="text-3xl font-black text-green-400">$55K-$72K</span>
                    <span className="text-xs font-bold uppercase tracking-wider text-green-500/80">Target Annual Pay</span>
                  </div>
                  <div className="inline-block px-3 py-1 rounded-lg bg-green-500/10 border border-green-500/20 text-xs font-bold text-green-300">
                    $0.52 - $0.58 CPM
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                   <div className="flex gap-3 text-left">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 border border-white/10">
                      <Calendar className="w-4 h-4 text-green-400" />
                    </div>
                    <div>
                      <p className="font-bold text-xs text-zinc-300 uppercase tracking-wider mb-0.5">Schedule</p>
                      <p className="text-sm text-zinc-200 font-medium">Home Weekly (Fri-Sun)</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3 text-left">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 border border-white/10">
                      <Map className="w-4 h-4 text-green-400" />
                    </div>
                    <div>
                      <p className="font-bold text-xs text-zinc-300 uppercase tracking-wider mb-0.5">Coverage</p>
                      <p className="text-sm text-zinc-200 font-medium">WA, OR, CA, ID, NV, AZ</p>
                    </div>
                  </div>

                  <div className="flex gap-3 text-left">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 border border-white/10">
                      <User className="w-4 h-4 text-green-400" />
                    </div>
                    <div>
                      <p className="font-bold text-xs text-zinc-300 uppercase tracking-wider mb-0.5">Best For</p>
                      <p className="text-sm text-zinc-200 font-medium">Balanced pay & home time</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-900/50 to-green-800/50 rounded-2xl p-5 border border-green-500/20">
                  <p className="text-sm font-bold mb-3 text-green-200">Typical Week:</p>
                  <ul className="text-sm text-green-100/80 space-y-2 font-medium">
                    <li>• Mon-Fri: On the road</li>
                    <li>• 2,500-3,000 miles/week</li>
                    <li>• 3-4 loads per week</li>
                    <li>• Home Friday-Sunday</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* OTR Routes */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
          >
            <Card className="h-full group border border-white/10 bg-white/5 hover:bg-white/10 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 backdrop-blur-sm">
              <CardContent className="pt-8 p-8">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-purple-500/10 rounded-2xl mb-4 shadow-inner border border-purple-500/20 group-hover:scale-110 transition-transform duration-300">
                    <Globe className="h-10 w-10 text-purple-500" />
                  </div>
                  <Badge className="mb-3 bg-purple-500/20 text-purple-300 border-purple-500/30 font-bold">Highest Earnings 💰</Badge>
                  <h3 className="text-2xl font-black mb-3 text-white">OTR Routes</h3>
                  <div className="flex flex-col items-center gap-1 mb-2">
                    <span className="text-3xl font-black text-purple-400">$65K-$280K</span>
                    <span className="text-xs font-bold uppercase tracking-wider text-purple-500/80">Target Annual Pay</span>
                  </div>
                  <div className="inline-block px-3 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-xs font-bold text-purple-300">
                    $0.55-$0.60 CPM / 91% O/O
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                   <div className="flex gap-3 text-left">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 border border-white/10">
                      <Globe className="w-4 h-4 text-purple-400" />
                    </div>
                    <div>
                      <p className="font-bold text-xs text-zinc-300 uppercase tracking-wider mb-0.5">Schedule</p>
                      <p className="text-sm text-zinc-200 font-medium">2-3 Weeks Out, 3-4 Days Home</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3 text-left">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 border border-white/10">
                      <Map className="w-4 h-4 text-purple-400" />
                    </div>
                    <div>
                      <p className="font-bold text-xs text-zinc-300 uppercase tracking-wider mb-0.5">Coverage</p>
                      <p className="text-sm text-zinc-200 font-medium">Nationwide (All 48 States)</p>
                    </div>
                  </div>

                  <div className="flex gap-3 text-left">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 border border-white/10">
                      <DollarSign className="w-4 h-4 text-purple-400" />
                    </div>
                    <div>
                      <p className="font-bold text-xs text-zinc-300 uppercase tracking-wider mb-0.5">Best For</p>
                      <p className="text-sm text-zinc-200 font-medium">Max earnings & Owner Operators</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-900/50 to-purple-800/50 rounded-2xl p-5 border border-purple-500/20">
                  <p className="text-sm font-bold mb-3 text-purple-200">Owner Operator Benefits:</p>
                  <ul className="text-sm text-purple-100/80 space-y-2 font-medium">
                    <li>• 91% of gross revenue</li>
                    <li>• Average $2.25-$3.25/mile</li>
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

