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
import { BENEFITS, COMPANY_INFO, PAY_RATES, WORKPLACE } from "@/lib/constants"

interface JobDetailsDialogProps {
  jobType?: "company" | "owner"
}

export function JobDetailsDialog({ jobType = "company" }: JobDetailsDialogProps) {
  const [open, setOpen] = useState(false)
  const cd = PAY_RATES.companyDriver
  const oo = PAY_RATES.ownerOperator

  const jobDetails = {
    company: {
      title: "CDL-A Company Driver — Local, Regional & OTR",
      type: "Full-Time",
      salary: `${cd.local.annual.split("-")[0]}–${cd.otr.annual.split("-")[1]}/year`,
      applyHref: "/apply?type=company",
      description: `${cd.local.perMile} per mile on every lane. Local home ${cd.local.homeTime.toLowerCase()} (${cd.local.annual}/year), regional home ${cd.regional.homeTime.toLowerCase()} (${cd.regional.annual}/year), OTR ${cd.otr.homeTime} out (${cd.otr.annual}/year). Sign-on ${cd.signOnBonus}.`,
      requirements: [
        "Valid CDL Class A license",
        `${PAY_RATES.requirements.companyDriver} (required)`,
        WORKPLACE.elp,
        "Clean driving record (no major violations in past 3 years)",
        "Pass DOT physical and drug screening",
        "21 years or older",
      ],
      benefits: [...BENEFITS.companyDriver, WORKPLACE.languages],
      routes: [
        `Local: ${cd.local.perMile}/mile, home ${cd.local.homeTime.toLowerCase()}, ${cd.local.annual}/year`,
        `Regional: ${cd.local.perMile}/mile, home ${cd.regional.homeTime.toLowerCase()}, ${cd.regional.annual}/year`,
        `OTR: ${cd.local.perMile}/mile, ${cd.otr.homeTime} out, ${cd.otr.annual}/year`,
        "Same per-mile rate on every lane — picking local is not a pay cut",
      ],
    },
    owner: {
      title: "Owner Operator — lease on",
      type: "Independent Contractor",
      salary: `${oo.annualGross}/year typical gross`,
      applyHref: "/apply?type=owner",
      description: `Keep ${oo.commission} of the linehaul with ${oo.fuelSurcharge} fuel-surcharge pass-through. Typical gross ${oo.annualGross}/year at ${oo.perMile}/mile — your revenue depends on the miles you choose to run. Sign-on ${oo.signOnBonus}. No forced dispatch.`,
      requirements: [
        "Valid CDL Class A license",
        PAY_RATES.requirements.otr,
        "Your own tractor with current registration and inspection",
        WORKPLACE.elp,
        "Clean driving record",
      ],
      benefits: [...BENEFITS.ownerOperator, WORKPLACE.languages],
      routes: [
        `Typical freight: ${oo.perMile}/mile`,
        `${oo.commission} of gross — you keep ${oo.commission}`,
        `${oo.fuelSurcharge} fuel surcharge pass-through`,
        "Flatbed, reefer, or dry van — you pick the load",
        "No forced dispatch",
      ],
    },
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
                <Badge variant="outline">{COMPANY_INFO.location}</Badge>
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
              {details.requirements.map((req) => (
                <li key={req} className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{req}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-3">Pay, benefits, and other compensation</h3>
            <div className="grid md:grid-cols-2 gap-2">
              {details.benefits.map((benefit) => (
                <div key={benefit} className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-green-600 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-3">Route options</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              {details.routes.map((route) => (
                <div key={route} className="flex items-start gap-2">
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
            href={`tel:${COMPANY_INFO.phoneFormatted}`}
            className="w-full sm:w-auto bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-center"
          >
            Call {COMPANY_INFO.phone}
          </a>
          <Link
            href={details.applyHref}
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
