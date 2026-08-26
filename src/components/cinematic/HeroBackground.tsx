"use client"

import { memo, useEffect, useRef } from "react"

const VIDEO_SRC = "/images/generated/hero-american-fleet.mp4?v=3"

/**
 * Whether the hero background video is worth its ~3MB download.
 *
 * Drivers apply from phones on truck-stop Wi-Fi/weak LTE (see the
 * responsive-performance skill): on a small screen the cinematic loop is
 * mostly hidden behind the text-contrast overlays anyway, so the 44KB
 * poster carries the design and the 3MB MP4 just competes with fonts,
 * the pay numbers, and the Apply CTA for bandwidth. Load the video only
 * on tablet-and-up viewports, and never for users who asked for reduced
 * data or reduced motion.
 *
 * Pure and exported for unit tests (same pattern as Footer's
 * shouldHideMobileCommandBar).
 */
export function shouldLoadHeroVideo({
  viewportWidth,
  saveData,
  reducedMotion,
}: {
  viewportWidth: number
  saveData: boolean
  reducedMotion: boolean
}): boolean {
  if (reducedMotion) return false
  if (saveData) return false
  return viewportWidth >= 768
}

export const HeroBackground = memo(() => {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // The <video> is rendered without a src on purpose: with autoplay+muted
    // the browser would start pulling the full MP4 at parse time, before we
    // can decide it isn't wanted. Attaching the source here (post-hydration)
    // keeps phones on the poster and costs desktop only a poster-covered
    // moment before the loop starts.
    const connection = (navigator as { connection?: { saveData?: boolean } }).connection
    const load = shouldLoadHeroVideo({
      viewportWidth: window.innerWidth,
      saveData: connection?.saveData === true,
      reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    })
    if (!load) {
      // Poster frame stays — nothing to download, nothing to animate.
      video.removeAttribute("autoplay")
      video.pause()
      return
    }

    video.src = VIDEO_SRC
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
        preload="none"
        className="w-full h-full object-cover"
        poster="/images/generated/hero-poster.webp"
      />
      {/* Cinematic overlay - gradient for better text contrast */}
      <div className="absolute inset-0 bg-gradient-to-b from-navy/40 via-navy/60 to-navy/95" />
      {/* Additional high-contrast overlay for mobile text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 mix-blend-multiply opacity-70" />
    </div>
  )
})

HeroBackground.displayName = "HeroBackground"
