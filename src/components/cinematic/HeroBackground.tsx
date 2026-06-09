"use client"

import { memo, useEffect, useRef } from "react"

export const HeroBackground = memo(() => {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // Respect users who prefer reduced motion — leave the poster frame in place.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      video.removeAttribute("autoplay")
      video.pause()
      return
    }

    video.playbackRate = 0.75
    video.play().catch(() => {
      // Autoplay blocked — poster remains visible, nothing to do.
    })
  }, [])

  return (
    <div className="absolute inset-0 z-0 bg-navy pointer-events-none">
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        className="w-full h-full object-cover"
        poster="/images/generated/hero-poster.webp"
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
