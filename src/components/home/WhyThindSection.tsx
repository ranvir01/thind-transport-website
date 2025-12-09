import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export function WhyThindSection() {
  return (
    <section className="py-16 bg-white">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Why Thind Transport is Different
          </h2>
          <p className="text-xl text-gray-600">
            Not just another trucking company - we're a family
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card className="bg-gradient-to-br from-blue-50 to-white border-2 border-blue-100">
            <CardContent className="pt-6 text-center">
              <div className="text-4xl mb-3">🏆</div>
              <h3 className="font-bold text-lg mb-2">Industry-Leading Commission</h3>
              <p className="text-3xl font-black text-green-600 mb-2">91%</p>
              <p className="text-sm text-gray-600">
                Most companies offer 70-85%. We give you 91% because we believe in rewarding hard work.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-white border-2 border-green-100">
            <CardContent className="pt-6 text-center">
              <div className="text-4xl mb-3">💰</div>
              <h3 className="font-bold text-lg mb-2">No Hidden Fees</h3>
              <p className="text-2xl font-black text-blue-600 mb-2">100% Transparent</p>
              <p className="text-sm text-gray-600">
                What you see is what you get. No surprise deductions. Fuel surcharge passes 100% to you.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-white border-2 border-purple-100">
            <CardContent className="pt-6 text-center">
              <div className="text-4xl mb-3">👨‍👩‍👧‍👦</div>
              <h3 className="font-bold text-lg mb-2">Family Owned Since 2016</h3>
              <p className="text-2xl font-black text-purple-600 mb-2">20+ Years Experience</p>
              <p className="text-sm text-gray-600">
                Our owner has 20+ years in trucking. We understand the business from a driver's perspective.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-white border-2 border-red-100">
            <CardContent className="pt-6 text-center">
              <div className="text-4xl mb-3">📈</div>
              <h3 className="font-bold text-lg mb-2">Fast Growing</h3>
              <p className="text-2xl font-black text-red-600 mb-2">15 Trucks</p>
              <p className="text-sm text-gray-600">
                Started small, growing smart. We're expanding and looking for drivers to grow with us.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Comparison */}
        <div className="bg-gradient-to-r from-blue-600 to-red-600 rounded-xl p-8 text-white">
          <h3 className="text-2xl font-bold text-center mb-8">What Sets Us Apart</h3>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h4 className="font-bold text-xl mb-4 flex items-center gap-2">
                <span>✅</span> What We Do
              </h4>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <span className="text-yellow-300 mt-1">✓</span>
                  <span><strong>Pay 91% commission</strong> - Among highest in industry</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-300 mt-1">✓</span>
                  <span><strong>Transparent settlements</strong> - See every penny</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-300 mt-1">✓</span>
                  <span><strong>Respect your time</strong> - Flexible scheduling</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-300 mt-1">✓</span>
                  <span><strong>Consistent freight</strong> - Year-round work</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-300 mt-1">✓</span>
                  <span><strong>Actually answer phones</strong> - 24/7 dispatch</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-300 mt-1">✓</span>
                  <span><strong>Sign-on bonuses</strong> - $1K-$2.5K to start</span>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-xl mb-4 flex items-center gap-2">
                <span>❌</span> What We Don't Do
              </h4>
              <ul className="space-y-3 text-red-100">
                <li className="flex items-start gap-2">
                  <span className="text-red-300 mt-1">✗</span>
                  <span><strong>No forced dispatch</strong> - You choose loads</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-300 mt-1">✗</span>
                  <span><strong>No hidden fees</strong> - What you see is what you get</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-300 mt-1">✗</span>
                  <span><strong>No surprise deductions</strong> - Transparent accounting</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-300 mt-1">✗</span>
                  <span><strong>No broken promises</strong> - We honor commitments</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-300 mt-1">✗</span>
                  <span><strong>No ignoring drivers</strong> - You're not just a number</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-300 mt-1">✗</span>
                  <span><strong>No run-down equipment</strong> - Well-maintained fleet</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

