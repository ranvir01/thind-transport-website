"use client"

import { motion } from "framer-motion"
import { Star, ExternalLink } from "lucide-react"

interface ReviewPlatform {
  name: string
  rating: number
  reviewCount: number
  logo: React.ReactNode
  url: string
  color: string
}

const platforms: ReviewPlatform[] = [
  {
    name: "Google",
    rating: 4.8,
    reviewCount: 127,
    logo: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    ),
    url: "https://google.com/maps",
    color: "bg-white",
  },
  {
    name: "Indeed",
    rating: 4.6,
    reviewCount: 89,
    logo: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#2164f3">
        <path d="M11.566 21.563v-8.762c.308.039.617.058.926.058 1.862 0 3.569-.702 4.859-1.856v10.56c0 .817-.447 1.227-1.341 1.227h-3.103c-.895 0-1.341-.41-1.341-1.227zm1.03-21.563c2.727 0 4.938 2.211 4.938 4.938s-2.211 4.938-4.938 4.938-4.938-2.211-4.938-4.938 2.211-4.938 4.938-4.938z"/>
      </svg>
    ),
    url: "https://indeed.com/cmp",
    color: "bg-[#2164f3]/10",
  },
  {
    name: "Glassdoor",
    rating: 4.5,
    reviewCount: 56,
    logo: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#0CAA41">
        <path d="M17.657.006H4.286c-.281 0-.51.228-.51.509v22.97c0 .281.229.509.51.509h15.428c.281 0 .51-.228.51-.509V4.634c0-.135-.054-.265-.15-.361L17.657.006zM12 18c-3.314 0-6-2.686-6-6s2.686-6 6-6 6 2.686 6 6-2.686 6-6 6z"/>
      </svg>
    ),
    url: "https://glassdoor.com/Overview",
    color: "bg-[#0CAA41]/10",
  },
]

interface ReviewBadgesProps {
  variant?: "horizontal" | "vertical" | "compact"
  className?: string
}

export const ReviewBadges = ({ variant = "horizontal", className = "" }: ReviewBadgesProps) => {
  if (variant === "compact") {
    return (
      <div className={`flex items-center gap-4 ${className}`}>
        {platforms.map((platform) => (
          <a
            key={platform.name}
            href={platform.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-white/80 hover:text-white transition-colors"
          >
            {platform.logo}
            <span className="font-bold">{platform.rating}</span>
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map(i => (
                <Star 
                  key={i} 
                  className={`w-3 h-3 ${i <= Math.floor(platform.rating) ? 'fill-orange text-orange' : 'text-white/50'}`} 
                />
              ))}
            </div>
          </a>
        ))}
      </div>
    )
  }

  if (variant === "vertical") {
    return (
      <div className={`space-y-3 ${className}`}>
        {platforms.map((platform, index) => (
          <motion.a
            key={platform.name}
            href={platform.url}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all group"
          >
            <div className={`w-10 h-10 rounded-lg ${platform.color} flex items-center justify-center`}>
              {platform.logo}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-navy">{platform.rating}</span>
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map(i => (
                    <Star 
                      key={i} 
                      className={`w-3.5 h-3.5 ${i <= Math.floor(platform.rating) ? 'fill-orange text-orange' : 'text-gray-200'}`} 
                    />
                  ))}
                </div>
              </div>
              <p className="text-xs text-gray-500">{platform.reviewCount} reviews on {platform.name}</p>
            </div>
            <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-navy transition-colors" />
          </motion.a>
        ))}
      </div>
    )
  }

  // Horizontal (default)
  return (
    <div className={`flex flex-wrap justify-center gap-4 ${className}`}>
      {platforms.map((platform, index) => (
        <motion.a
          key={platform.name}
          href={platform.url}
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all group"
        >
          <div className={`w-10 h-10 rounded-lg ${platform.color} flex items-center justify-center`}>
            {platform.logo}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-navy text-lg">{platform.rating}</span>
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map(i => (
                  <Star 
                    key={i} 
                    className={`w-4 h-4 ${i <= Math.floor(platform.rating) ? 'fill-orange text-orange' : 'text-gray-200'}`} 
                  />
                ))}
              </div>
            </div>
            <p className="text-xs text-gray-500">{platform.reviewCount} reviews</p>
          </div>
        </motion.a>
      ))}
    </div>
  )
}

// Aggregate Rating Badge (for use in hero, etc.)
export const AggregateRating = ({ className = "" }: { className?: string }) => {
  const avgRating = platforms.reduce((acc, p) => acc + p.rating, 0) / platforms.length
  const totalReviews = platforms.reduce((acc, p) => acc + p.reviewCount, 0)

  return (
    <div className={`inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 ${className}`}>
      <div className="flex gap-0.5">
        {[1,2,3,4,5].map(i => (
          <Star 
            key={i} 
            className={`w-4 h-4 ${i <= Math.floor(avgRating) ? 'fill-orange text-orange' : 'text-white/50'}`} 
          />
        ))}
      </div>
      <span className="text-white font-bold">{avgRating.toFixed(1)}</span>
      <span className="text-white/70 text-sm">({totalReviews} reviews)</span>
    </div>
  )
}

