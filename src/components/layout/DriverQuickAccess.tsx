"use client"

import { useState } from "react"
import Link from "next/link"
import { 
  TruckIcon, Package, MapPin, DollarSign, 
  FileText, Clock, BarChart3, AlertCircle 
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export function DriverQuickAccess() {
  const [isExpanded, setIsExpanded] = useState(false)
  
  // Simulated driver data (in real app, this would come from auth/API)
  const driverData = {
    name: "John D.",
    driverId: "DR-2024-1234",
    status: "Available",
    nextLoad: {
      pickup: "Seattle, WA",
      delivery: "Portland, OR", 
      time: "Tomorrow 6:00 AM",
      pay: "$450"
    },
    weeklyEarnings: "$2,845",
    milesThisWeek: "1,423"
  }

  return (
    <div className="relative">
      <Button 
        variant="outline"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="bg-blue-50 border-blue-200 hover:bg-blue-100"
      >
        <TruckIcon className="h-4 w-4 mr-2" />
        <span className="hidden md:inline">{driverData.name}</span>
        <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700">
          {driverData.status}
        </Badge>
      </Button>

      {isExpanded && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 z-50 mega-menu-enter">
          {/* Driver Info Header */}
          <div className="mb-4 pb-4 border-b">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-gray-900">{driverData.name}</h3>
                <p className="text-sm text-gray-500">ID: {driverData.driverId}</p>
              </div>
              <Badge className="bg-green-100 text-green-700">
                {driverData.status}
              </Badge>
            </div>
          </div>

          {/* Next Load */}
          {driverData.nextLoad && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-4 w-4 text-blue-600" />
                <span className="font-semibold text-sm">Next Load</span>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Route:</span>
                  <span className="font-medium">{driverData.nextLoad.pickup} → {driverData.nextLoad.delivery}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Pickup:</span>
                  <span className="font-medium">{driverData.nextLoad.time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Pay:</span>
                  <span className="font-bold text-green-600">{driverData.nextLoad.pay}</span>
                </div>
              </div>
            </div>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <DollarSign className="h-3.5 w-3.5" />
                <span className="text-xs">This Week</span>
              </div>
              <p className="font-bold text-lg">{driverData.weeklyEarnings}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <MapPin className="h-3.5 w-3.5" />
                <span className="text-xs">Miles</span>
              </div>
              <p className="font-bold text-lg">{driverData.milesThisWeek}</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-2">
            <Link 
              href="/driver-portal/loads"
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Package className="h-4 w-4 text-gray-500" />
              <span className="text-sm">View Available Loads</span>
              <Badge variant="secondary" className="ml-auto text-xs">12 new</Badge>
            </Link>
            <Link 
              href="/driver-portal/documents"
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <FileText className="h-4 w-4 text-gray-500" />
              <span className="text-sm">My Documents</span>
            </Link>
            <Link 
              href="/driver-portal/earnings"
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <BarChart3 className="h-4 w-4 text-gray-500" />
              <span className="text-sm">Earnings Report</span>
            </Link>
            <Link 
              href="/driver-portal/time-off"
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="text-sm">Request Time Off</span>
            </Link>
          </div>

          {/* Alert/Notice */}
          <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-yellow-800">
                  <strong>Reminder:</strong> Annual DOT inspection due in 14 days
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
