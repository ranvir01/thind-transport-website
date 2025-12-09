"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

interface JobDetailsDialogProps {
  jobType?: "company" | "owner"
}

export function JobDetailsDialog({ jobType = "company" }: JobDetailsDialogProps) {
  const [open, setOpen] = useState(false)
  
  const jobDetails = {
    company: {
      title: "Regional Company Truck Driver",
      type: "Full-Time",
      salary: "$55K-$72K/year",
      description: "Join our team as a regional company driver. $0.52-0.58 per mile with excellent benefits and flexible home time.",
      requirements: [
        "Valid CDL Class A license",
        "Minimum 1 year company driver experience (REQUIRED)",
        "Clean driving record (no major violations in past 3 years)",
        "Pass DOT physical and drug screening",
        "21 years or older",
        "Able to pass background check"
      ],
      benefits: [
        "$1,500 sign-on bonus (first year)",
        "$0.52-0.58 per mile (regional)",
        "Weekly direct deposit pay - Every Friday",
        "Flexible home time - Regional routes",
        "Home on weekends",
        "Consistent freight year-round",
        "Modern, well-maintained equipment",
        "24/7 dispatch support",
        "Fuel card programs available"
      ],
      routes: [
        "Regional routes: $0.52-0.58 per mile",
        "Home on weekends - Work 5 days",
        "Annual earning potential: $55K-$72K",
        "Consistent miles and freight",
        "Multiple route options available"
      ]
    },
    owner: {
      title: "OTR → Owner Operator",
      type: "Independent Contractor",
      salary: "$180K-$280K/year",
      description: "91% Paid Off! Partner with us as an OTR owner operator. Industry-leading commission with no forced dispatch and no hidden fees.",
      requirements: [
        "Valid CDL Class A license",
        "Minimum 2 years OTR experience (REQUIRED)",
        "Your own power unit (truck)",
        "Cargo and liability insurance ($1M minimum)",
        "Clean driving record",
        "MC authority (or we can help you get it)"
      ],
      benefits: [
        "91% Paid Off - Industry-leading commission!",
        "$2,500 sign-on bonus",
        "No forced dispatch - you choose your loads",
        "No hidden fees or deductions",
        "Transparent weekly settlements",
        "Fuel surcharge passed through 100%",
        "Weekly settlements and fast pay options",
        "Fuel card programs with discounts",
        "Maintenance and tire discounts",
        "24/7 dispatch support",
        "Factoring services available",
        "Consistent quality freight across Flatbed, Reefer, Dry Van"
      ],
      routes: [
        "OTR loads nationwide: Average $2.25-$3.25 per mile",
        "91% of gross - YOU keep 91%!",
        "Flatbed, Reefer, or Dry Van freight",
        "No forced dispatch - pick your lanes",
        "Consistent freight year-round"
      ]
    }
  }
  
  const details = jobDetails[jobType]
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="text-blue-600 font-semibold hover:underline inline-flex items-center gap-1">
          View Full Details
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-2xl mb-2">{details.title}</DialogTitle>
              <div className="flex items-center gap-2 mb-2">
                <Badge>{details.type}</Badge>
                <Badge variant="secondary">{details.salary}</Badge>
                <Badge variant="outline">Kent, WA</Badge>
              </div>
            </div>
          </div>
          <DialogDescription className="text-base">
            {details.description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold text-lg mb-3">Requirements</h3>
            <ul className="space-y-2">
              {details.requirements.map((req, index) => (
                <li key={index} className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{req}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold text-lg mb-3">Benefits & Perks</h3>
            <div className="grid md:grid-cols-2 gap-2">
              {details.benefits.map((benefit, index) => (
                <div key={index} className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-green-600 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold text-lg mb-3">Route Options</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              {details.routes.map((route, index) => (
                <div key={index} className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-purple-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                  <span className="text-sm font-medium">{route}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <DialogFooter className="flex-col sm:flex-row gap-3">
          <a 
            href="tel:+12067656300"
            className="w-full sm:w-auto bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-center"
          >
            Call (206) 765-6300
          </a>
          <Link 
            href="/apply"
            className="w-full sm:w-auto bg-green-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-600 transition-colors text-center"
            onClick={() => setOpen(false)}
          >
            Apply Now
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

