"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, RefreshCw, LogIn } from "lucide-react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to console
    console.error("Application page error:", error)
    
    // Clear any potentially corrupted localStorage data
    if (typeof window !== 'undefined') {
      try {
        const keys = Object.keys(localStorage)
        keys.forEach(key => {
          if (key.startsWith('thind_driver_application')) {
            console.log("Clearing corrupted data:", key)
            localStorage.removeItem(key)
          }
        })
      } catch (e) {
        console.error("Failed to clear localStorage:", e)
      }
    }
  }, [error])

  const handleRetry = () => {
    // Reset the error boundary
    reset()
  }

  const handleBackToLogin = () => {
    window.location.href = "/driver/login"
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <CardTitle className="text-xl text-gray-900">Something went wrong</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">
            We encountered an error loading your application. We've automatically cleared any corrupted data.
          </p>
          
          <div className="flex flex-col gap-2">
            <Button onClick={handleRetry} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            <Button 
              variant="outline" 
              onClick={handleBackToLogin}
              className="w-full"
            >
              <LogIn className="mr-2 h-4 w-4" />
              Back to Login
            </Button>
          </div>
          
          <p className="text-sm text-gray-500">
            If this problem persists, please contact us at (206) 765-6300
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

