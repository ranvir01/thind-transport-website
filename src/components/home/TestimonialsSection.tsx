"use client"

import Link from "next/link"
import { TestimonialsCarousel } from "@/components/shared/TestimonialsCarousel"

export function TestimonialsSection() {
  return (
    <section className="py-16 bg-gray-50">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            What Our Drivers Say
          </h2>
          <p className="text-xl text-gray-600 mb-4">
            Real feedback from real drivers in our fleet
          </p>
          <div className="flex items-center justify-center gap-2">
            <div className="flex text-yellow-400">
              {[...Array(5)].map((_, i) => (
                <svg
                  key={i}
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <span className="text-gray-600 font-semibold">
              4.8/5 from 75+ drivers
            </span>
          </div>
        </div>

        <TestimonialsCarousel />

        <div className="text-center mt-8">
          <Link
            href="/testimonials"
            className="text-blue-600 font-semibold hover:underline"
          >
            Read More Reviews →
          </Link>
        </div>
      </div>
    </section>
  )
}

