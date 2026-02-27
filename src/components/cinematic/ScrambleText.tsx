"use client"

import { useState, useEffect, useRef } from "react"
import { motion, useInView } from "framer-motion"

const CHARS = "-_~=+*^!@#$%"

interface ScrambleTextProps {
  children: string
  className?: string
  delay?: number
  scrambleSpeed?: number
  revealSpeed?: number
  trigger?: "hover" | "view" | "load"
}

export const ScrambleText = ({ 
  children, 
  className, 
  delay = 0, 
  scrambleSpeed = 30,
  revealSpeed = 0.5, // characters per interval
  trigger = "view"
}: ScrambleTextProps) => {
  const [text, setText] = useState(children)
  const [isScrambling, setIsScrambling] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-10% 0px" })

  useEffect(() => {
    if (trigger === "view" && isInView) {
        const timeout = setTimeout(() => setIsScrambling(true), delay * 1000)
        return () => clearTimeout(timeout)
    } else if (trigger === "load") {
        const timeout = setTimeout(() => setIsScrambling(true), delay * 1000)
        return () => clearTimeout(timeout)
    }
  }, [trigger, isInView, delay])

  const handleMouseEnter = () => {
    if (trigger === "hover") {
      setIsScrambling(true)
    }
  }

  useEffect(() => {
    if (!isScrambling) {
        if (trigger !== "hover") setText(children) // Reset if not hovering for other triggers? Actually, usually we want it to stay revealed.
        // For hover, we might want it to reset or just scramble once. Let's assume scramble once per trigger.
        // If trigger is hover, we usually want it to scramble again on re-hover.
        return
    }

    let iteration = 0
    const interval = setInterval(() => {
      setText(prev => 
        children.split("").map((char, index) => {
          if (index < iteration) return children[index]
          return CHARS[Math.floor(Math.random() * CHARS.length)]
        }).join("")
      )

      if (iteration >= children.length) {
        clearInterval(interval)
        if (trigger === "hover") setIsScrambling(false)
      }
      iteration += revealSpeed
    }, scrambleSpeed)

    return () => clearInterval(interval)
  }, [isScrambling, children, revealSpeed, scrambleSpeed, trigger])

  return (
    <motion.span
      ref={ref}
      className={className}
      onMouseEnter={handleMouseEnter}
    >
      {text}
    </motion.span>
  )
}

