import { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  LayoutDashboard, Truck, DollarSign, Fuel, ShieldCheck, Smartphone,
  PlugZap, ArrowRight, CheckCircle2, MapPin, FileText,
} from "lucide-react"
import { PageBreadcrumb } from "@/components/shared/PageBreadcrumb"

export const metadata: Metadata = {
  title: "LoadOff TMS | The Software That Runs Thind Transport",
  description:
    "LoadOff is the transportation management system built in-house at Thind Transport: dispatch, invoicing, driver settlements, fuel + IFTA, compliance, and a driver phone app — one calm place to run a trucking company.",
  alternates: { canonical: "/loadoff" },
}

const MODULES = [
  {
    icon: LayoutDashboard,
    title: "Today command center",
    text: "One screen answers the morning: loads due, drivers who haven't confirmed, PODs missing, money you haven't invoiced yet.",
  },
  {
    icon: Truck,
    title: "Dispatch + live map",
    text: "Drag-and-drop week planner, dispatch board, and live truck positions with HOS clocks when an ELD is connected.",
  },
  {
    icon: DollarSign,
    title: "Money, end to end",
    text: "Rate con to invoice PDF to payment to driver settlement — pay rules, advances, and factoring handled in integer-cent math.",
  },
  {
    icon: Fuel,
    title: "Fuel + IFTA",
    text: "Fuel card feeds or CSV imports become MPG, fraud flags, fuel-to-load costing, and reefer-exempt-correct IFTA quarters.",
  },
  {
    icon: ShieldCheck,
    title: "Compliance wall",
    text: "CDL, medical card, registration, insurance, IFTA filings — expiry alerts land before the DOT notices, with an accident register built in.",
  },
  {
    icon: Smartphone,
    title: "Driver phone app",
    text: "Dispatch confirm, status taps, camera PODs, chat, pay stubs, time off — installable straight from the browser, no app store.",
  },
] as const

export default function LoadOffPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <PageBreadcrumb pageName="LoadOff TMS" category="Company" />

      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white py-20">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
        <div className="container relative">
          <div className="text-center max-w-4xl mx-auto">
            <Badge className="mb-6 bg-white/10 backdrop-blur-md text-white border-white/20 px-4 py-2 text-sm font-bold">
              <PlugZap className="h-4 w-4 mr-1.5" />
              Built in-house. Runs our fleet every day.
            </Badge>
            <h1 className="text-5xl md:text-6xl font-black mb-6 leading-tight">
              LoadOff<span className="text-indigo-300">.</span> Take a load off.
            </h1>
            <p className="text-xl text-white/85 max-w-3xl mx-auto leading-relaxed">
              The transportation management system we built to run Thind Transport — dispatch,
              invoicing, settlements, fuel, IFTA, and compliance in one calm place, with a phone
              app drivers actually use.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100" asChild>
                <Link href="/hub">
                  Open LoadOff <ArrowRight className="h-5 w-5 ml-2" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10" asChild>
                <Link href="/schedule-meeting">
                  <FileText className="h-5 w-5 mr-2" /> Ask for a walkthrough
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-16">
        {/* Watch it run — real screen recordings with captions, no audio needed */}
        <h2 className="text-3xl font-black text-gray-900 text-center mb-3">Watch it run</h2>
        <p className="text-center text-gray-600 mb-8 max-w-2xl mx-auto">
          Real recordings of the live product with captions — no sound needed.
        </p>
        <div className="grid lg:grid-cols-3 gap-8 mb-16 items-start">
          <Card className="lg:col-span-2 overflow-hidden shadow-xl border-gray-100">
            <video
              poster="/videos/poster-office.jpg"
              controls
              muted
              playsInline
              preload="none"
              className="w-full h-auto"
              aria-label="LoadOff office walkthrough: Today, dispatch, loads, money, and integrations in 36 seconds"
            >
              <source src="/videos/tour-office.mp4" type="video/mp4" />
              <source src="/videos/tour-office.webm" type="video/webm" />
            </video>
            <p className="px-5 py-3 text-sm text-gray-600 border-t border-gray-100">
              The whole morning in 36 seconds — Today, dispatch, loads, money, integrations.
            </p>
          </Card>
          <div className="space-y-8">
            <Card className="overflow-hidden shadow-xl border-gray-100">
              <video
                poster="/videos/poster-money.jpg"
                controls
                muted
                playsInline
                preload="none"
                className="w-full h-auto"
                aria-label="LoadOff money walkthrough: invoices, receivables, and driver settlements"
              >
                <source src="/videos/tour-money.mp4" type="video/mp4" />
                <source src="/videos/tour-money.webm" type="video/webm" />
              </video>
              <p className="px-5 py-3 text-sm text-gray-600 border-t border-gray-100">
                From delivered to paid — invoices and settlements.
              </p>
            </Card>
            <Card className="overflow-hidden shadow-xl border-gray-100 max-w-[300px] mx-auto lg:mx-0">
              <video
                poster="/videos/poster-driver.jpg"
                controls
                muted
                playsInline
                preload="none"
                className="w-full h-auto"
                aria-label="LoadOff driver app walkthrough: confirm a dispatch, pay stubs, and install from the browser"
              >
                <source src="/videos/tour-driver.mp4" type="video/mp4" />
                <source src="/videos/tour-driver.webm" type="video/webm" />
              </video>
              <p className="px-5 py-3 text-sm text-gray-600 border-t border-gray-100">
                The driver app — installs from the browser.
              </p>
            </Card>
          </div>
        </div>

        {/* Modules */}
        <h2 className="text-3xl font-black text-gray-900 text-center mb-10">
          Everything a small carrier runs on
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {MODULES.map((mod) => (
            <Card key={mod.title} className="p-6 border-gray-100 hover:shadow-xl transition-shadow duration-300">
              <div className="w-11 h-11 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-4">
                <mod.icon className="h-6 w-6 text-indigo-600" />
              </div>
              <h3 className="font-bold text-gray-900 text-lg mb-2">{mod.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{mod.text}</p>
            </Card>
          ))}
        </div>

        {/* Principles strip */}
        <Card className="p-8 mb-16 bg-gradient-to-br from-slate-50 via-indigo-50/40 to-slate-50 border-indigo-100 shadow-xl">
          <div className="grid md:grid-cols-3 gap-6 text-center">
            <div>
              <MapPin className="h-6 w-6 text-indigo-600 mx-auto mb-2" />
              <h4 className="font-bold text-gray-900">Integrations with a fallback</h4>
              <p className="text-sm text-gray-600 mt-1">
                ELD, fuel cards, load boards, QuickBooks — every connection has a CSV or manual
                path that always works, so nothing ever blocks the day.
              </p>
            </div>
            <div>
              <CheckCircle2 className="h-6 w-6 text-indigo-600 mx-auto mb-2" />
              <h4 className="font-bold text-gray-900">Tested like money depends on it</h4>
              <p className="text-sm text-gray-600 mt-1">
                700+ automated tests cover the math that pays drivers and bills brokers, because
                it does.
              </p>
            </div>
            <div>
              <ShieldCheck className="h-6 w-6 text-indigo-600 mx-auto mb-2" />
              <h4 className="font-bold text-gray-900">Multi-tenant from day one</h4>
              <p className="text-sm text-gray-600 mt-1">
                Thind Transport is tenant #1. Every query is carrier-scoped, every credential
                encrypted at rest, every change audit-logged.
              </p>
            </div>
          </div>
        </Card>

        {/* CTA */}
        <Card className="p-10 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white text-center shadow-2xl">
          <h2 className="text-3xl font-bold mb-4">See it running</h2>
          <p className="text-lg mb-6 text-white/85 max-w-2xl mx-auto">
            LoadOff dispatches our trucks, bills our brokers, and pays our drivers today.
            Open it, or ask us for a walkthrough with demo data.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100" asChild>
              <Link href="/hub">
                Open LoadOff <ArrowRight className="h-5 w-5 ml-2" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10" asChild>
              <Link href="/schedule-meeting">Schedule a walkthrough</Link>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
