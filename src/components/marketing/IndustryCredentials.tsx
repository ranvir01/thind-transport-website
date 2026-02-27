import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  MAJOR_CLIENTS,
  PREMIER_BROKERS,
  TRUST_INDICATORS,
} from "@/lib/constants"
import {
  Award,
  BadgeCheck,
  CheckCircle2,
  Shield,
  ShieldCheck,
} from "lucide-react"

const certificationIconMap = {
  "shield-check": ShieldCheck,
  "badge-check": BadgeCheck,
  award: Award,
  shield: Shield,
} as const

export function IndustryCredentials() {
  return (
    <section className="relative py-24 bg-white overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-50 via-transparent to-transparent opacity-40" />
      <div className="container relative">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-5 py-2 text-sm font-bold text-blue-700 mb-6 border border-blue-100 shadow-sm">
            <BadgeCheck className="h-4 w-4" />
            Certifications & Partners
          </div>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 mb-6">
            Certified. Trusted. Proven.
          </h2>
          <p className="text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto">
            Backed by industry-leading compliance, safety, and partnerships
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {TRUST_INDICATORS.certifications.map((cert) => {
            const Icon =
              certificationIconMap[cert.icon as keyof typeof certificationIconMap] ??
              CheckCircle2

            return (
              <Card key={cert.name} className="h-full bg-white border-2 border-blue-100 hover:border-blue-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <CardContent className="pt-8 text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg">
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <h3 className="font-bold text-lg text-gray-900">
                    {cert.name}
                  </h3>
                  <p className="text-sm text-gray-600 font-medium">{cert.issuer}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mb-16">
          <Card className="bg-white border-2 border-blue-100 shadow-xl hover:shadow-2xl transition-shadow">
            <CardContent className="p-8">
              <div className="text-center mb-8">
                <h3 className="text-3xl font-bold text-gray-900 mb-3">
                  Premier Broker Partnerships
                </h3>
                <p className="text-gray-600 text-lg">
                  Consistent freight from top-tier national broker networks
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {PREMIER_BROKERS.map((broker) => (
                  <div
                    key={broker.name}
                    className="rounded-2xl border-2 border-blue-100 bg-gradient-to-br from-white to-blue-50/30 p-5 shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                  >
                    <div className="font-bold text-gray-900 text-base mb-2">
                      {broker.name}
                    </div>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 font-semibold">
                      {broker.tier}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-2 border-green-100 shadow-xl hover:shadow-2xl transition-shadow">
            <CardContent className="p-8">
              <div className="text-center mb-8">
                <h3 className="text-3xl font-bold text-gray-900 mb-3">
                  Fortune 500 Shippers
                </h3>
                <p className="text-gray-600 text-lg">
                  Trusted with high-value national distribution lanes
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {MAJOR_CLIENTS.map((client) => (
                  <div
                    key={client.name}
                    className="rounded-2xl border-2 border-green-100 bg-gradient-to-br from-white to-green-50/30 p-5 shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                  >
                    <div className="font-bold text-gray-900 text-base mb-1">
                      {client.name}
                    </div>
                    <p className="text-sm text-gray-600 font-medium mb-2">{client.category}</p>
                    <Badge variant="outline" className="border-green-600 text-green-700 font-semibold">
                      {client.duration}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-gradient-to-br from-blue-600 via-blue-700 to-green-600 text-white shadow-2xl border-0">
          <CardContent className="p-10">
            <div className="text-center mb-10">
              <h3 className="text-4xl font-black mb-3">Proven Safety Record</h3>
              <p className="text-xl text-white/90 font-light">
                Performance metrics monitored in real-time with zero compromises
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {TRUST_INDICATORS.performance.map((metric) => (
                <div key={metric.label} className="bg-white/10 rounded-2xl p-6 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all">
                  <div className="text-5xl font-black mb-2">{metric.value}</div>
                  <div className="text-sm text-white font-semibold uppercase tracking-wide">{metric.label}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
