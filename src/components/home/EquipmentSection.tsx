"use client"

import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle2, Truck, Wrench, Shield } from "lucide-react"
import { motion } from "framer-motion"

export function EquipmentSection() {
  return (
    <section className="relative py-24 bg-[#020617] overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent opacity-60" />
      <div className="container relative">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-900/30 px-6 py-2.5 text-sm font-bold text-blue-400 mb-6 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
            <Truck className="h-4 w-4" />
            <span>Our Fleet</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight tracking-tight">
            Modern, Well-Maintained Equipment
          </h2>
          <p className="text-lg md:text-xl text-zinc-300 leading-relaxed max-w-3xl mx-auto font-medium">
            15 trucks and growing • Multiple trailer types • All equipment DOT compliant
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          <motion.div 
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             transition={{ delay: 0.1 }}
          >
            <Card className="h-full border border-white/10 bg-white/5 hover:bg-white/[0.07] transition-all duration-300 rounded-2xl overflow-hidden group backdrop-blur-sm">
              <CardContent className="p-8">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-500/10 rounded-2xl mb-5 shadow-inner border border-blue-500/20 group-hover:scale-105 transition-all group-hover:bg-blue-500/20">
                    <Truck className="h-10 w-10 text-blue-500" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2 text-white">Trailers & Equipment</h3>
                </div>
                <ul className="space-y-4">
                  <li className="flex items-start gap-4 bg-white/[0.03] rounded-xl p-4 border border-white/5 hover:border-blue-500/30 transition-all group/item">
                    <CheckCircle2 className="h-6 w-6 text-blue-500 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <span className="font-bold text-zinc-100 block mb-1.5 text-base group-hover/item:text-blue-400 transition-colors">Flatbed Trailers</span>
                      <p className="text-sm text-zinc-400 leading-relaxed">48-53 ft • Perfect for building materials, steel, machinery</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-4 bg-white/[0.03] rounded-xl p-4 border border-white/5 hover:border-blue-500/30 transition-all group/item">
                    <CheckCircle2 className="h-6 w-6 text-blue-500 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <span className="font-bold text-zinc-100 block mb-1.5 text-base group-hover/item:text-blue-400 transition-colors">Reefer Trailers</span>
                      <p className="text-sm text-zinc-400 leading-relaxed">Temperature controlled • Food grade • Pharmaceutical</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-4 bg-white/[0.03] rounded-xl p-4 border border-white/5 hover:border-blue-500/30 transition-all group/item">
                    <CheckCircle2 className="h-6 w-6 text-blue-500 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <span className="font-bold text-zinc-100 block mb-1.5 text-base group-hover/item:text-blue-400 transition-colors">Dry Van</span>
                      <p className="text-sm text-zinc-400 leading-relaxed">53 ft • General freight • Retail goods</p>
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
            <Card className="h-full border border-white/10 bg-white/5 hover:bg-white/[0.07] transition-all duration-300 rounded-2xl overflow-hidden group backdrop-blur-sm">
              <CardContent className="p-8">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500/10 rounded-2xl mb-5 shadow-inner border border-green-500/20 group-hover:scale-105 transition-all group-hover:bg-green-500/20">
                    <Wrench className="h-10 w-10 text-green-500" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2 text-white">Maintenance & Support</h3>
                </div>
                <ul className="space-y-3">
                  {[
                    "Regular preventive maintenance schedule",
                    "24/7 roadside assistance",
                    "Maintenance discounts for owner operators",
                    "In-house mechanical support",
                    "Modern diagnostic equipment"
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 bg-white/[0.03] rounded-xl p-4 border border-white/5 hover:border-green-500/30 transition-all group/item">
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                      <span className="text-sm font-medium text-zinc-300 leading-relaxed group-hover/item:text-green-400 transition-colors">{item}</span>
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
            <Card className="h-full border border-white/10 bg-white/5 hover:bg-white/[0.07] transition-all duration-300 rounded-2xl overflow-hidden group backdrop-blur-sm">
              <CardContent className="p-8">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-purple-500/10 rounded-2xl mb-5 shadow-inner border border-purple-500/20 group-hover:scale-105 transition-all group-hover:bg-purple-500/20">
                    <Shield className="h-10 w-10 text-purple-500" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2 text-white">Safety & Compliance</h3>
                </div>
                <ul className="space-y-3">
                  {[
                    "DOT compliant fleet",
                    "FMCSA safety rated",
                    "Regular safety training",
                    "Modern safety features",
                    "Insurance support for O/O"
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 bg-white/[0.03] rounded-xl p-4 border border-white/5 hover:border-purple-500/30 transition-all group/item">
                      <CheckCircle2 className="h-5 w-5 text-purple-500 mt-0.5 shrink-0" />
                      <span className="text-sm font-medium text-zinc-300 leading-relaxed group-hover/item:text-purple-400 transition-colors">{item}</span>
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

