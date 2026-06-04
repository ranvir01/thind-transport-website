"use client"

/** Static industrial backdrop: blueprint grid + soft warm accent glow. No mouse-spotlight. */
export const ActiveBackground = () => {
  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden bg-[#080d12]" aria-hidden>
      {/* Blueprint grid */}
      <div
        className="absolute inset-0 opacity-[0.3]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
          backgroundSize: "52px 52px",
        }}
      />
      {/* Warm accent glows */}
      <div className="accent-orb -top-32 -right-24 h-[28rem] w-[28rem] bg-orange-600/25 animate-pulse-glow" />
      <div className="accent-orb top-1/3 -left-32 h-[24rem] w-[24rem] bg-gold-600/12" />
      <div className="accent-orb bottom-0 right-1/4 h-[22rem] w-[22rem] bg-orange-700/12" />
    </div>
  )
}
