"use client"

import { useState } from "react"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { Play, X, Star, Quote, Clock, MapPin, DollarSign } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface VideoTestimonialCardProps {
  name: string
  role: string
  location: string
  yearsWithCompany: string
  quote: string
  earnings?: string
  rating: number
  image: string
  videoUrl?: string
  previousEmployer?: string
  variant?: "card" | "featured" | "compact"
}

export function VideoTestimonialCard({
  name,
  role,
  location,
  yearsWithCompany,
  quote,
  earnings,
  rating,
  image,
  videoUrl,
  previousEmployer,
  variant = "card"
}: VideoTestimonialCardProps) {
  const [showVideo, setShowVideo] = useState(false)

  if (variant === "compact") {
    return (
      <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-100 hover:shadow-xl transition-all">
        <div className="flex items-center gap-3 mb-3">
          <div className="relative">
            <Image
              src={image}
              alt={name}
              width={40}
              height={40}
              className="rounded-full object-cover"
            />
            {videoUrl && (
              <button
                onClick={() => setShowVideo(true)}
                className="absolute -bottom-1 -right-1 w-5 h-5 bg-orange rounded-full flex items-center justify-center"
              >
                <Play className="h-3 w-3 text-white ml-0.5" />
              </button>
            )}
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">{name}</p>
            <p className="text-xs text-gray-500">{role}</p>
          </div>
          <div className="ml-auto flex gap-0.5">
            {[...Array(5)].map((_, i) => (
              <Star 
                key={i} 
                className={`h-3 w-3 ${i < rating ? 'fill-orange text-orange' : 'text-gray-300'}`} 
              />
            ))}
          </div>
        </div>
        <p className="text-sm text-gray-600 line-clamp-2 italic">"{quote}"</p>
      </div>
    )
  }

  if (variant === "featured") {
    return (
      <div className="relative bg-gradient-to-br from-navy to-navy-600 rounded-2xl overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange/20 via-transparent to-transparent" />
        
        <div className="relative p-8 md:p-10">
          <Quote className="absolute top-6 right-6 h-20 w-20 text-white/10" />
          
          <div className="flex flex-col md:flex-row gap-8">
            {/* Image/Video */}
            <div className="relative flex-shrink-0">
              <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-2xl overflow-hidden shadow-2xl">
                <Image
                  src={image}
                  alt={name}
                  fill
                  className="object-cover"
                />
                {videoUrl && (
                  <button
                    onClick={() => setShowVideo(true)}
                    className="absolute inset-0 bg-black/30 flex items-center justify-center group hover:bg-black/40 transition-colors"
                  >
                    <div className="w-14 h-14 rounded-full bg-orange flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <Play className="h-6 w-6 text-white ml-1" />
                    </div>
                  </button>
                )}
              </div>
              {videoUrl && (
                <Badge className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-orange text-white text-xs">
                  Watch Video
                </Badge>
              )}
            </div>

            {/* Content */}
            <div className="flex-1">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={`h-5 w-5 ${i < rating ? 'fill-orange text-orange' : 'text-white/50'}`} 
                  />
                ))}
              </div>
              
              <blockquote className="text-lg md:text-xl text-white leading-relaxed mb-6">
                "{quote}"
              </blockquote>

              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div>
                  <h4 className="font-bold text-white text-lg">{name}</h4>
                  <p className="text-white/70">{role}</p>
                </div>
                <div className="sm:ml-auto flex flex-wrap gap-2">
                  <Badge className="bg-white/10 text-white/90 border-white/20">
                    <MapPin className="h-3 w-3 mr-1" /> {location}
                  </Badge>
                  <Badge className="bg-white/10 text-white/90 border-white/20">
                    <Clock className="h-3 w-3 mr-1" /> {yearsWithCompany}
                  </Badge>
                  {earnings && (
                    <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                      <DollarSign className="h-3 w-3 mr-1" /> {earnings}
                    </Badge>
                  )}
                </div>
              </div>

              {previousEmployer && (
                <p className="mt-4 text-sm text-white/80">
                  Previously at: <span className="text-white/80">{previousEmployer}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Video Modal */}
        <AnimatePresence>
          {showVideo && videoUrl && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
              onClick={() => setShowVideo(false)}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                className="relative w-full max-w-4xl aspect-video bg-black rounded-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setShowVideo(false)}
                  className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
                <iframe
                  src={videoUrl}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // Default card variant
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all group">
      {/* Image with video play button */}
      <div className="relative h-48">
        <Image
          src={image}
          alt={name}
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        
        {videoUrl && (
          <button
            onClick={() => setShowVideo(true)}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="w-16 h-16 rounded-full bg-orange/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <Play className="h-7 w-7 text-white ml-1" />
            </div>
          </button>
        )}

        {/* Name overlay */}
        <div className="absolute bottom-4 left-4">
          <h4 className="font-bold text-white text-lg">{name}</h4>
          <p className="text-white/80 text-sm">{role}</p>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="flex items-center gap-1 mb-3">
          {[...Array(5)].map((_, i) => (
            <Star 
              key={i} 
              className={`h-4 w-4 ${i < rating ? 'fill-orange text-orange' : 'text-gray-300'}`} 
            />
          ))}
        </div>
        
        <blockquote className="text-gray-600 italic mb-4 line-clamp-3">
          "{quote}"
        </blockquote>

        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <MapPin className="h-3 w-3" /> {location}
            <span className="text-gray-300">•</span>
            <Clock className="h-3 w-3" /> {yearsWithCompany}
          </div>
          {earnings && (
            <Badge className="bg-green-50 text-green-700 border-green-200 text-xs">
              {earnings}
            </Badge>
          )}
        </div>
      </div>

      {/* Video Modal */}
      <AnimatePresence>
        {showVideo && videoUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={() => setShowVideo(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative w-full max-w-4xl aspect-video bg-black rounded-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowVideo(false)}
                className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
              <iframe
                src={videoUrl}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

