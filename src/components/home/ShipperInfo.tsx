import { ArrowRight, Clock, MapPin, ShieldCheck, TrendingUp } from "lucide-react"
import Link from "next/link"

export const ShipperInfo = () => {
  return (
    <section className="py-24 bg-zinc-50 border-t border-zinc-200">
      <div className="container px-4 md:px-6">
         <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
            <div>
               <div className="flex items-center gap-2 mb-4">
                  <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                  <span className="font-mono text-xs uppercase tracking-widest text-zinc-500">For Partners & Shippers</span>
               </div>
               <h2 className="text-4xl md:text-5xl font-black text-[#001F3F] max-w-2xl tracking-tight">
                  Partner with the Pacific Northwest's Elite Fleet.
               </h2>
            </div>
            <Link href="/contact" className="group flex items-center gap-2 font-bold text-[#001F3F] border-b-2 border-[#001F3F] hover:text-orange-500 hover:border-orange-500 transition-colors pb-1">
               <span>Request a Rate Quote</span>
               <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
         </div>

         <div className="grid md:grid-cols-4 gap-8">
            {[
               {
                  icon: Clock,
                  title: "99% On-Time",
                  desc: "Time-critical delivery with real-time tracking visibility."
               },
               {
                  icon: ShieldCheck,
                  title: "Cargo Safety",
                  desc: "Full value insurance coverage and vetted professional drivers."
               },
               {
                  icon: MapPin,
                  title: "Nationwide",
                  desc: "Dedicated lanes across WA, OR, ID, CA and 48 states coverage."
               },
               {
                  icon: TrendingUp,
                  title: "Scalable Capacity",
                  desc: "From a single pallet to drop-trailer programs, we grow with you."
               }
            ].map((item, i) => (
               <div key={i} className="group bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl transition-shadow border border-zinc-100">
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-orange-500 transition-colors duration-300">
                     <item.icon className="w-6 h-6 text-[#001F3F] group-hover:text-white transition-colors duration-300" />
                  </div>
                  <h3 className="text-xl font-bold text-[#001F3F] mb-3">{item.title}</h3>
                  <p className="text-zinc-600 leading-relaxed text-sm">
                     {item.desc}
                  </p>
               </div>
            ))}
         </div>
      </div>
    </section>
  )
}
























