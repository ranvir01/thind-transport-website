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
  id,
  className,
}: {
  children: ReactNode
  minHeight: number
  rootMargin?: string
  /** Put the fragment target on the reserved slot, not on the lazy child:
   *  the slot is server-rendered, so `#id` resolves before the child mounts.
   *  Scrolling to it is then what trips the observer. */
  id?: string
  className?: string
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
    <div ref={ref} id={id} className={className} style={show ? undefined : { minHeight }}>
      {show ? children : null}
    </div>
  )
}
