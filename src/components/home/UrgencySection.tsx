"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export function UrgencySection() {
  const [spotsLeft, setSpotsLeft] = useState(3)

  useEffect(() => {
    // Simulate spots decreasing
    const interval = setInterval(() => {
      setSpotsLeft((prev) => Math.max(1, Math.floor(Math.random() * 5) + 1))
    }, 30000) // Update every 30 seconds

    return () => clearInterval(interval)
  }, [])

  return (
    <section className="bg-red-600 text-white py-8">
      <div className="container">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold mb-2">
              Limited Openings Available
            </h2>
            <p className="text-red-100">
              Only{" "}
              <span className="font-bold text-yellow-300">{spotsLeft}</span>{" "}
              positions remaining this month
            </p>
          </div>
          <Button
            asChild
            size="lg"
            className="bg-white text-red-600 hover:bg-gray-100 whitespace-nowrap"
          >
            <Link href="/apply">Secure Your Spot Now →</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}

