"use client"

import { motion, useMotionValue, useSpring, AnimatePresence } from "framer-motion"
import { useEffect, useState } from "react"

export const CustomCursor = () => {
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const [isHovering, setIsHovering] = useState(false)
  const [hoverText, setHoverText] = useState("")

  // Smooth spring animation
  const springConfig = { damping: 25, stiffness: 700 }
  const cursorX = useSpring(mouseX, springConfig)
  const cursorY = useSpring(mouseY, springConfig)

  useEffect(() => {
    const moveCursor = (e: MouseEvent) => {
      mouseX.set(e.clientX - 10) // Center offset for base size (20px)
      mouseY.set(e.clientY - 10)
    }

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const link = target.closest("a") || target.closest("button")
      
      if (link) {
        setIsHovering(true)
        // Check for data-cursor attribute for custom text
        const text = link.getAttribute("data-cursor")
        setHoverText(text || "")
      } else {
        setIsHovering(false)
        setHoverText("")
      }
    }

    window.addEventListener("mousemove", moveCursor)
    window.addEventListener("mouseover", handleMouseOver)

    return () => {
      window.removeEventListener("mousemove", moveCursor)
      window.removeEventListener("mouseover", handleMouseOver)
    }
  }, [mouseX, mouseY])

  return (
    <>
      {/* Main Cursor Ring */}
      <motion.div
        className="fixed top-0 left-0 w-5 h-5 border border-white rounded-full pointer-events-none z-[9999] mix-blend-difference"
        style={{
          x: cursorX,
          y: cursorY,
          scale: isHovering ? 3 : 1,
          backgroundColor: isHovering ? "#f97316" : "transparent", // Orange when hovering
          borderColor: isHovering ? "transparent" : "white",
        }}
      />
      
      {/* Hover Text */}
      <AnimatePresence>
        {isHovering && hoverText && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="fixed top-0 left-0 pointer-events-none z-[10000] text-[10px] font-bold text-black uppercase tracking-widest"
            style={{
              x: cursorX,
              y: cursorY,
              left: 22, // Offset to center in the scaled cursor
              top: 22,
            }}
          >
            {hoverText}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

