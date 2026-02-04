import Image from "next/image"

export const ThindPromise = () => {
  return (
    <section className="py-20 md:py-32 bg-white relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-1/3 h-full bg-zinc-50/50 skew-x-12 pointer-events-none" />

      <div className="container relative z-10 px-4 md:px-6">
        <div className="grid md:grid-cols-2 gap-12 md:gap-20 items-center">
          <div className="relative group">
             <div className="relative aspect-square md:aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl">
                <Image 
                  src="/images/generated/driver-portrait-3.png" 
                  alt="Maninder Thind - Founder"
                  fill
                  className="object-cover grayscale group-hover:grayscale-0 transition-all duration-700 scale-100 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#001F3F]/80 via-transparent to-transparent opacity-80"></div>
                <div className="absolute bottom-8 left-8 text-white transform translate-y-0 transition-transform">
                    <p className="font-mono text-xs text-orange-500 mb-2 tracking-widest">THE FOUNDER</p>
                    <h3 className="text-3xl font-bold">Maninder Thind</h3>
                </div>
             </div>
             {/* Decorative element */}
             <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-orange-500 rounded-full z-[-1]" />
             <div className="absolute -top-6 -left-6 w-32 h-32 border-2 border-[#001F3F]/10 rounded-full z-[-1]" />
          </div>

          <div className="space-y-8">
             <h2 className="text-4xl md:text-6xl font-black text-[#001F3F] leading-[0.9]">
                THE THIND PROMISE.
             </h2>
             <div className="space-y-6 text-lg text-zinc-600 leading-relaxed font-medium">
                <p>
                   "I started with one truck in 2014. I know what it’s like behind the wheel—the long hours, the missed milestones, and the feeling of just being a number."
                </p>
                <p>
                   "That’s why we built Thind Transport differently. We pay 91% not because it's industry-leading, but because <strong className="text-[#001F3F]">you earned it.</strong> We invest in new equipment because your safety is my responsibility."
                </p>
                <p>
                   "When you drive for us, you're not just moving freight. You're building a future. And I promise to help you get there."
                </p>
             </div>
             <div className="pt-4">
                <div className="inline-block border-l-4 border-orange-500 pl-6">
                   <p className="font-serif text-3xl text-[#001F3F] font-bold italic">Maninder Thind</p>
                   <p className="text-xs text-zinc-500 uppercase tracking-widest mt-2 font-bold">Founder & CEO</p>
                </div>
             </div>
          </div>
        </div>
      </div>
    </section>
  )
}















