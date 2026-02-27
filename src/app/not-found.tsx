import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { TruckIcon, Home, Phone, FileText, ArrowLeft } from "lucide-react"
import { COMPANY_INFO } from "@/lib/constants"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center">
        {/* Animated Truck Icon */}
        <div className="relative mb-8">
          <div className="flex justify-center">
            <div className="relative">
              <TruckIcon className="h-32 w-32 text-gray-300" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-6xl font-black text-red-600">404</span>
              </div>
            </div>
          </div>
          <div className="mt-4 flex justify-center gap-2">
            <div className="h-1 w-16 bg-blue-600 rounded-full"></div>
            <div className="h-1 w-16 bg-red-600 rounded-full"></div>
            <div className="h-1 w-16 bg-blue-600 rounded-full"></div>
          </div>
        </div>

        {/* Error Message */}
        <h1 className="text-4xl font-black text-gray-900 mb-4">
          Road Not Found!
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Looks like this route isn't on our map yet. Let's get you back on track.
        </p>

        {/* Quick Actions */}
        <div className="grid sm:grid-cols-2 gap-4 max-w-md mx-auto mb-8">
          <Link href="/" className="group">
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-all transform hover:-translate-y-1">
              <Home className="h-8 w-8 text-blue-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-1">Return Home</h3>
              <p className="text-sm text-gray-600">Back to main page</p>
            </div>
          </Link>
          <Link href="/apply" className="group">
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-all transform hover:-translate-y-1">
              <FileText className="h-8 w-8 text-green-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-1">Apply Now</h3>
              <p className="text-sm text-gray-600">Start earning today</p>
            </div>
          </Link>
        </div>

        {/* Contact Support */}
        <div className="bg-blue-50 rounded-lg p-6 mb-8">
          <p className="text-gray-700 mb-4">
            Need help finding what you're looking for?
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild variant="outline">
              <Link href="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Link>
            </Button>
            <Button asChild>
              <Link href={`tel:${COMPANY_INFO.phoneFormatted}`}>
                <Phone className="h-4 w-4 mr-2" />
                Call {COMPANY_INFO.phone}
              </Link>
            </Button>
          </div>
        </div>

        {/* Popular Pages */}
        <div className="text-left max-w-md mx-auto">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">
            Popular pages you might be looking for:
          </h2>
          <div className="space-y-2">
            <Link href="/pay-rates" className="block text-blue-600 hover:underline text-sm">
              → Driver Pay Rates & Calculator
            </Link>
            <Link href="/apply" className="block text-blue-600 hover:underline text-sm">
              → Quick Application (60 seconds)
            </Link>
            <Link href="/testimonials" className="block text-blue-600 hover:underline text-sm">
              → Driver Reviews & Testimonials
            </Link>
            <Link href="/" className="block text-blue-600 hover:underline text-sm">
              → Home Page
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
