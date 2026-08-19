"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"

/**
 * Mounts children only when the wrapper scrolls near the viewport.
 * For heavy below-the-fold client components on landing pages: their JS
 * chunks stop competing with the hero (LCP) for bandwidth and main thread.
 * `minHeight` reserves the slot so late mounting never shifts layout.
 */
export function LazyMount({
  children,
  minHeight,
  rootMargin = "800px",
}: {
  children: ReactNode
  minHeight: number
  rootMargin?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!("IntersectionObserver" in window)) {
      queueMicrotask(() => setShow(true))
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShow(true)
          io.disconnect()
        }
      },
      { rootMargin }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [rootMargin])

  return (
    <div ref={ref} style={show ? undefined : { minHeight }}>
      {show ? children : null}
    </div>
  )
}
