import { Metadata } from "next"
import { COMPANY_INFO } from "@/lib/constants"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export const metadata: Metadata = {
  title: "Owner Operator Pay Breakdown | 91% Split Explained",
  description: "Detailed explanation of how our 91% split works. No hidden fees. 100% fuel surcharge pass-through. See the math behind the highest paying trucking jobs.",
}

export default function PayBreakdownPage() {
  return (
    <div className="bg-white min-h-screen pt-24 pb-12">
      <div className="container mx-auto px-4 max-w-3xl">
        <Link href="/" className="inline-flex items-center text-gray-500 hover:text-orange mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>
        
        <h1 className="text-4xl md:text-5xl font-black text-navy mb-8 leading-tight">
          Owner Operator <span className="text-orange">Pay Breakdown</span>
        </h1>
        
        <div className="prose prose-lg max-w-none text-gray-700">
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-navy mb-4">How does the 91% split work?</h2>
            <p className="text-xl leading-relaxed mb-6 font-medium text-navy/80">
              It's simple mathematics, not magic. <strong>We take 9% for admin/dispatch. You keep 91%.</strong> We pass through 100% of fuel surcharges.
            </p>
            <p className="mb-4">
              Unlike many carriers who take 25-30% of your hard-earned money, Thind Transport operates on a lean, efficient model that puts more profit in your pocket. We handle the billing, collections, and dispatching, so you can focus on driving.
            </p>
            <div className="bg-orange/5 border-l-4 border-orange p-4 my-6">
              <p className="font-bold text-navy m-0">The Golden Rule:</p>
              <p className="m-0">If the load pays $1,000, you get $910. Period.</p>
            </div>
            <ul className="list-disc pl-6 space-y-2 mb-6 marker:text-orange">
              <li><strong>Linehaul:</strong> You keep 91% of the gross rate.</li>
              <li><strong>Fuel Surcharge:</strong> We pass through 100% of fuel surcharges to you.</li>
              <li><strong>Accessorials:</strong> You keep 91% of detention, layover, and stop pay.</li>
            </ul>
          </section>

          <section className="mb-12 bg-white shadow-xl shadow-navy/5 p-8 rounded-2xl border border-gray-100">
            <h3 className="text-2xl font-bold text-navy mb-6 mt-0">Example Load Breakdown</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="text-center p-6 bg-gray-50 rounded-xl">
                <h4 className="font-bold text-gray-500 uppercase tracking-wider text-sm mb-2">Total Gross Load</h4>
                <p className="text-5xl font-black text-navy">$3,000</p>
                <p className="text-xs text-gray-400 mt-2">Linehaul Only</p>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                  <span className="font-medium">Your Share (91%)</span>
                  <span className="font-bold text-navy text-lg">$2,730.00</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-100 pb-3 opacity-60">
                  <span>Thind Fee (9%)</span>
                  <span>$270.00</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="font-black text-orange text-lg">You Keep</span>
                  <span className="font-black text-3xl text-orange">$2,730.00</span>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-navy mb-4">Who pays 91% split?</h2>
            <p>
              Thind Transport pays 91% split to all owner operators. We believe that if you own the truck and do the driving, you should keep the majority of the revenue. This structure is designed to help owner operators succeed in volatile markets by maximizing their revenue per mile.
            </p>
          </section>

          <section className="mt-12 pt-8 border-t border-gray-100">
            <h2 className="text-2xl font-bold text-navy mb-6">Ready to start earning more?</h2>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link 
                href="/apply" 
                className="inline-flex justify-center items-center px-8 py-4 bg-orange text-white font-bold rounded-xl hover:bg-orange-600 transition-colors no-underline"
              >
                Apply Now
              </Link>
              <Link 
                href="/#calculator" 
                className="inline-flex justify-center items-center px-8 py-4 bg-navy text-white font-bold rounded-xl hover:bg-navy-700 transition-colors no-underline"
              >
                Calculate Your Pay
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

