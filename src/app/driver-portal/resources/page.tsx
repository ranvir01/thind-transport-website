"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function DriverPortalResourcesRedirect() {
  const router = useRouter()
  
  useEffect(() => {
    // Redirect to main resources page
    router.replace("/resources")
  }, [router])
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-lg">Redirecting to resources...</p>
    </div>
  )
}

