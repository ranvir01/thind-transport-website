"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PAY_RATES } from "@/lib/constants"

export function PayRatesTabs() {
  return (
    <Tabs defaultValue="company" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="company">Company Driver</TabsTrigger>
        <TabsTrigger value="owner">Owner Operator</TabsTrigger>
      </TabsList>
      
      <TabsContent value="company" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Company Driver Pay Structure</CardTitle>
            <CardDescription>
              Competitive mileage rates with consistent pay and benefits
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-navy-900">Local Routes</h3>
                  <Badge className="bg-navy-600">Home Daily</Badge>
                </div>
                <p className="text-3xl font-bold text-navy-700 mb-1">{PAY_RATES.companyDriver.local.perMile}</p>
                <p className="text-sm text-gray-600 mb-3">per mile</p>
                <ul className="mt-3 space-y-1 text-sm text-gray-600">
                  <li>✓ Home every night</li>
                  <li>✓ Predictable schedule</li>
                  <li>✓ {PAY_RATES.companyDriver.local.annual} annually</li>
                  <li>✓ Work-life balance</li>
                </ul>
              </div>
              
              <div className="bg-orange-50 p-4 rounded-lg border-2 border-orange-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-orange-900">Regional Routes</h3>
                  <Badge className="bg-orange-600">Home Weekly</Badge>
                </div>
                <p className="text-3xl font-bold text-orange-700 mb-1">{PAY_RATES.companyDriver.regional.perMile}</p>
                <p className="text-sm text-gray-600 mb-3">per mile</p>
                <ul className="mt-3 space-y-1 text-sm text-gray-600">
                  <li>✓ Home on weekends</li>
                  <li>✓ More consistent miles</li>
                  <li>✓ {PAY_RATES.companyDriver.regional.annual} annually</li>
                  <li>✓ Great earning potential</li>
                </ul>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-purple-900">OTR Routes</h3>
                  <Badge className="bg-purple-600">Highest Pay</Badge>
                </div>
                <p className="text-3xl font-bold text-purple-700 mb-1">{PAY_RATES.companyDriver.otr.perMile}</p>
                <p className="text-sm text-gray-600 mb-3">per mile</p>
                <ul className="mt-3 space-y-1 text-sm text-gray-600">
                  <li>✓ Maximum miles & earnings</li>
                  <li>✓ 2-3 weeks out</li>
                  <li>✓ {PAY_RATES.companyDriver.otr.annual} annually</li>
                  <li>✓ See the country</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-4 bg-yellow-50 border-2 border-yellow-200 p-4 rounded-lg text-center">
              <p className="font-bold text-lg mb-2 text-yellow-900">🎉 {PAY_RATES.companyDriver.signOnBonus}</p>
              <p className="text-sm text-yellow-800">Plus weekly pay, performance bonuses, and benefits</p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="owner" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Owner Operator Rates</CardTitle>
            <CardDescription>
              High commission rates with no forced dispatch
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gradient-to-r from-blue-50 to-green-50 p-6 rounded-lg border-2 border-blue-200">
              <div className="text-center mb-4">
                <h3 className="text-3xl font-bold mb-2 text-navy-800">91% Commission Rate</h3>
                <p className="text-gray-600">Industry-leading rate - Keep more of what you earn!</p>
                <div className="mt-2">
                  <span className="inline-block bg-orange-500 text-white px-4 py-2 rounded-full font-bold text-sm shadow-md">
                    {PAY_RATES.ownerOperator.signOnBonus} Sign-On Bonus
                  </span>
                </div>
              </div>
              
              <div className="grid md:grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-600">{PAY_RATES.ownerOperator.perMile}</p>
                  <p className="text-sm text-gray-600">Average per mile</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600">{PAY_RATES.ownerOperator.annualGross}</p>
                  <p className="text-sm text-gray-600">Annual potential</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-orange-600">91%</p>
                  <p className="text-sm text-gray-600">You keep this much</p>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <h4 className="font-bold mb-2 text-center text-gray-800">What Makes Us Different</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <span className="text-green-600 font-bold">✓</span>
                    <span>No hidden fees or deductions</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-600 font-bold">✓</span>
                    <span>Transparent weekly settlements</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-600 font-bold">✓</span>
                    <span>Fuel surcharge passed through 100%</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-600 font-bold">✓</span>
                    <span>No forced dispatch - YOU choose loads</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-600 font-bold">✓</span>
                    <span>{PAY_RATES.ownerOperator.signOnBonus} sign-on bonus</span>
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 className="font-semibold mb-3 text-gray-900">What You Provide</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">→</span>
                    <span>Your own truck (power unit)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">→</span>
                    <span>Cargo and liability insurance</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">→</span>
                    <span>Fuel and maintenance costs</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">→</span>
                    <span>Valid CDL Class A license</span>
                  </li>
                </ul>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 className="font-semibold mb-3 text-gray-900">What We Provide</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span>Consistent, quality freight</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span>Weekly settlements</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span>Fuel card programs</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span>24/7 dispatch support</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span>No forced dispatch</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span>Maintenance discounts</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
