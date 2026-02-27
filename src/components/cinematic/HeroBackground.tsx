"use client"

import { memo, useEffect, useRef } from "react"

export const HeroBackground = memo(() => {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current) {
      // Slow down video slightly (75% speed)
      videoRef.current.playbackRate = 0.75
      // Ensure video plays
      videoRef.current.play().catch(e => console.log("Autoplay prevented:", e))
    }
  }, [])

  return (
    <div className="absolute inset-0 z-0 bg-navy pointer-events-none">
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        className="w-full h-full object-cover md:object-fill"
        poster="/images/generated/fleet-kent-wa.png"
      >
        <source src="/images/generated/hero-american-fleet.mp4?v=3" type="video/mp4" />
      </video>
      {/* Cinematic overlay - gradient for better text contrast */}
      <div className="absolute inset-0 bg-gradient-to-b from-navy/40 via-navy/60 to-navy/95" />
      {/* Additional high-contrast overlay for mobile text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 mix-blend-multiply opacity-70" />
    </div>
  )
})

HeroBackground.displayName = "HeroBackground"

