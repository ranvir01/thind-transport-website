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
      {/* Cinematic overlay - lighter to show more video */}
      <div className="absolute inset-0 bg-gradient-to-b from-navy/30 via-navy/40 to-navy/90" />
      {/* Subtle vignette effect */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_40%,_rgba(0,31,63,0.3)_100%)]" />
    </div>
  )
})

HeroBackground.displayName = "HeroBackground"

