"use client"

import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle2, Truck, Wrench, Shield } from "lucide-react"
import { motion } from "framer-motion"

export function EquipmentSection() {
  return (
    <section className="relative py-12 sm:py-16 md:py-24 bg-[#020617] overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent opacity-60" />
      <div className="container relative px-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8 sm:mb-12 md:mb-16"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-900/30 px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-bold text-blue-400 mb-4 sm:mb-6 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
            <Truck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>Our Fleet</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white mb-3 sm:mb-4 leading-tight tracking-tight">
            Modern, Well-Maintained Equipment
          </h2>
          <p className="text-sm sm:text-base md:text-lg lg:text-xl text-zinc-300 leading-relaxed max-w-3xl mx-auto font-medium">
            15 trucks and growing • Multiple trailer types • All equipment DOT compliant
          </p>
        </motion.div>

        {/* Mobile: Stack, Desktop: 3 columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
          <motion.div 
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             transition={{ delay: 0.1 }}
          >
            <Card className="h-full border border-white/10 bg-white/5 hover:bg-white/[0.07] transition-all duration-300 rounded-xl sm:rounded-2xl overflow-hidden group backdrop-blur-sm">
              <CardContent className="p-4 sm:p-6 md:p-8">
                <div className="text-center mb-4 sm:mb-6 md:mb-8">
                  <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-blue-500/10 rounded-xl sm:rounded-2xl mb-3 sm:mb-5 shadow-inner border border-blue-500/20 group-hover:scale-105 transition-all group-hover:bg-blue-500/20">
                    <Truck className="h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10 text-blue-500" />
                  </div>
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold mb-1 sm:mb-2 text-white">Trailers & Equipment</h3>
                </div>
                <ul className="space-y-2 sm:space-y-3 md:space-y-4">
                  <li className="flex items-start gap-2 sm:gap-3 md:gap-4 bg-white/[0.03] rounded-lg sm:rounded-xl p-2.5 sm:p-3 md:p-4 border border-white/5 hover:border-blue-500/30 transition-all group/item">
                    <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-zinc-100 block mb-0.5 sm:mb-1.5 text-sm sm:text-base group-hover/item:text-blue-400 transition-colors">Flatbed Trailers</span>
                      <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">48-53 ft • Building materials, steel</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2 sm:gap-3 md:gap-4 bg-white/[0.03] rounded-lg sm:rounded-xl p-2.5 sm:p-3 md:p-4 border border-white/5 hover:border-blue-500/30 transition-all group/item">
                    <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-zinc-100 block mb-0.5 sm:mb-1.5 text-sm sm:text-base group-hover/item:text-blue-400 transition-colors">Reefer Trailers</span>
                      <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">Temp controlled • Food grade</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2 sm:gap-3 md:gap-4 bg-white/[0.03] rounded-lg sm:rounded-xl p-2.5 sm:p-3 md:p-4 border border-white/5 hover:border-blue-500/30 transition-all group/item">
                    <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-zinc-100 block mb-0.5 sm:mb-1.5 text-sm sm:text-base group-hover/item:text-blue-400 transition-colors">Dry Van</span>
                      <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">53 ft • General freight</p>
                    </div>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div 
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             transition={{ delay: 0.2 }}
          >
            <Card className="h-full border border-white/10 bg-white/5 hover:bg-white/[0.07] transition-all duration-300 rounded-xl sm:rounded-2xl overflow-hidden group backdrop-blur-sm">
              <CardContent className="p-4 sm:p-6 md:p-8">
                <div className="text-center mb-4 sm:mb-6 md:mb-8">
                  <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-green-500/10 rounded-xl sm:rounded-2xl mb-3 sm:mb-5 shadow-inner border border-green-500/20 group-hover:scale-105 transition-all group-hover:bg-green-500/20">
                    <Wrench className="h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10 text-green-500" />
                  </div>
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold mb-1 sm:mb-2 text-white">Maintenance & Support</h3>
                </div>
                <ul className="space-y-2 sm:space-y-3">
                  {[
                    "Preventive maintenance schedule",
                    "24/7 roadside assistance",
                    "O/O maintenance discounts",
                    "In-house mechanical support",
                    "Modern diagnostic equipment"
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 sm:gap-3 bg-white/[0.03] rounded-lg sm:rounded-xl p-2.5 sm:p-3 md:p-4 border border-white/5 hover:border-green-500/30 transition-all group/item">
                      <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 mt-0.5 shrink-0" />
                      <span className="text-xs sm:text-sm font-medium text-zinc-300 leading-relaxed group-hover/item:text-green-400 transition-colors">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div 
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             transition={{ delay: 0.3 }}
          >
            <Card className="h-full border border-white/10 bg-white/5 hover:bg-white/[0.07] transition-all duration-300 rounded-xl sm:rounded-2xl overflow-hidden group backdrop-blur-sm">
              <CardContent className="p-4 sm:p-6 md:p-8">
                <div className="text-center mb-4 sm:mb-6 md:mb-8">
                  <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-purple-500/10 rounded-xl sm:rounded-2xl mb-3 sm:mb-5 shadow-inner border border-purple-500/20 group-hover:scale-105 transition-all group-hover:bg-purple-500/20">
                    <Shield className="h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10 text-purple-500" />
                  </div>
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold mb-1 sm:mb-2 text-white">Safety & Compliance</h3>
                </div>
                <ul className="space-y-2 sm:space-y-3">
                  {[
                    "DOT compliant fleet",
                    "FMCSA safety rated",
                    "Regular safety training",
                    "Modern safety features",
                    "Insurance support for O/O"
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 sm:gap-3 bg-white/[0.03] rounded-lg sm:rounded-xl p-2.5 sm:p-3 md:p-4 border border-white/5 hover:border-purple-500/30 transition-all group/item">
                      <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500 mt-0.5 shrink-0" />
                      <span className="text-xs sm:text-sm font-medium text-zinc-300 leading-relaxed group-hover/item:text-purple-400 transition-colors">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
