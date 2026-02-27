"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

interface AnnouncementAlertProps {
  variant?: "default"
  onClose?: () => void
}

export function AnnouncementAlert({ variant = "default", onClose }: AnnouncementAlertProps) {
  return (
    <Alert className="bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <AlertTitle className="m-0">Limited Positions Available!</AlertTitle>
            <Badge className="bg-red-600">URGENT</Badge>
          </div>
          <AlertDescription className="text-gray-700">
            Only <span className="font-bold text-red-600">3 spots remaining</span> for immediate start this month. 
            <span className="font-semibold"> Apply today to secure your position.</span>
            <div className="mt-2 flex items-center gap-3">
              <Link href="/apply" className="text-blue-600 font-semibold hover:underline inline-flex items-center gap-1">
                Apply Now
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <span className="text-gray-500">•</span>
              <a href="tel:+12067656300" className="text-blue-600 font-semibold hover:underline">
                Call (206) 765-6300
              </a>
            </div>
          </AlertDescription>
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            className="text-gray-600 hover:text-gray-800 transition-colors"
            aria-label="Close announcement"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </Alert>
  )
}

