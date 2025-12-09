import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2 } from "lucide-react"

export function BenefitsComparison() {
  return (
    <section className="py-16 bg-white">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Compare Your Options
          </h2>
          <p className="text-xl text-gray-600">
            We offer opportunities for both company drivers and owner operators
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Company Driver Card */}
          <Card className="border-2 border-blue-200 hover:shadow-xl transition-shadow">
            <CardHeader className="bg-gradient-to-br from-blue-50 to-blue-100">
              <div className="flex items-center justify-between mb-2">
                <CardTitle className="text-2xl">Company Driver</CardTitle>
                <Badge className="bg-blue-600">W-2 Employee</Badge>
              </div>
              <CardDescription className="text-lg font-semibold text-blue-900">
                $50K-$78K Annual + Benefits
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-3 text-center">
                  <p className="font-bold text-lg text-yellow-900">🎉 $1,500 Sign-On Bonus</p>
                  <p className="text-sm text-gray-600">First year drivers</p>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Pay Structure</h4>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                      <span><strong>$0.50-0.60 per mile</strong> all routes</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                      <span>Weekly direct deposit - every Friday</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                      <span>Performance bonuses available</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Additional Perks</h4>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                      <span>Modern, well-maintained equipment</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                      <span>Consistent freight year-round</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                      <span>Flexible home time options</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Requirements</h4>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 mt-0.5">→</span>
                      <span><strong>Minimum 1 year</strong> company driver experience</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 mt-0.5">→</span>
                      <span>Valid CDL Class A</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 mt-0.5">→</span>
                      <span>Clean driving record</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Owner Operator Card */}
          <Card className="border-2 border-green-200 hover:shadow-xl transition-shadow">
            <CardHeader className="bg-gradient-to-br from-green-50 to-green-100">
              <div className="flex items-center justify-between mb-2">
                <CardTitle className="text-2xl">Owner Operator</CardTitle>
                <Badge className="bg-green-600">1099 Contractor</Badge>
              </div>
              <CardDescription className="text-lg font-semibold text-green-900">
                $180K-$280K Annual • 91% Commission
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-3 text-center">
                  <p className="font-bold text-lg text-yellow-900">🎉 $2,500 Sign-On Bonus</p>
                  <p className="text-sm text-gray-600">New owner operators</p>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Industry-Leading Rates</h4>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                      <span><strong>91% Paid Off</strong> - Keep 91% of gross!</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                      <span>Average $2.25-$3.25 per mile</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                      <span>100% fuel surcharge pass-through</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                      <span>No hidden fees or deductions</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Your Freedom</h4>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                      <span>No forced dispatch - pick your loads</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                      <span>Control your schedule</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                      <span>Choose your lanes</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Requirements</h4>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">→</span>
                      <span><strong>Minimum 2 years OTR</strong> experience</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">→</span>
                      <span>Your own truck</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">→</span>
                      <span>Insurance & authority</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-600 mb-4">Not sure which option is right for you?</p>
          <a
            href="tel:+12067659218"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            📞 Call (206) 765-9218 - We'll Help You Decide
          </a>
        </div>
      </div>
    </section>
  )
}

