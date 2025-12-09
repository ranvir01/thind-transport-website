"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { X, FileText, CheckCircle2, ArrowRight } from "lucide-react"

export function LeadMagnetModal() {
  const [showPopup, setShowPopup] = useState(false)
  const [hasShown, setHasShown] = useState(false)
  const [step, setStep] = useState<"offer" | "success">("offer")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Check if already shown in this session
    if (typeof window !== "undefined") {
      const shown = sessionStorage.getItem("leadMagnetShown")
      if (shown) {
        setHasShown(true)
        return
      }
    }

    const handleScroll = () => {
      const scrollPercent = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
      if (scrollPercent > 50 && !hasShown) {
         triggerPopup()
      }
    }

    const handleMouseLeave = (e: MouseEvent) => {
      // Only trigger if mouse is moving upward (toward address bar)
      if (e.clientY <= 0 && !hasShown) {
        triggerPopup()
      }
    }

    window.addEventListener("scroll", handleScroll)
    document.addEventListener("mouseleave", handleMouseLeave)
    return () => {
        window.removeEventListener("scroll", handleScroll)
        document.removeEventListener("mouseleave", handleMouseLeave)
    }
  }, [hasShown])

  const triggerPopup = () => {
    setShowPopup(true)
    if (typeof window !== "undefined") {
        sessionStorage.setItem("leadMagnetShown", "true")
    }
    setHasShown(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()
      setLoading(true)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      setLoading(false)
      setStep("success")
  }

  if (!showPopup) return null

  return (
    <div className="fixed inset-0 bg-black/80 z-[150] flex items-center justify-center p-4 animate-in fade-in duration-300 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full relative animate-in zoom-in duration-300 overflow-hidden max-h-[85vh] flex flex-col">
        <div className="absolute top-2 right-2 z-20">
          <button
            onClick={() => setShowPopup(false)}
            className="bg-white/80 backdrop-blur-md p-2 rounded-full text-gray-500 hover:text-gray-900 transition-colors shadow-sm border border-gray-100"
            aria-label="Close popup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {step === "offer" ? (
            <div className="grid md:grid-cols-[2fr_3fr] h-full">
                <div className="hidden md:flex bg-[#001F3F] p-8 flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"></div>
                    <div className="relative z-10">
                        <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-orange-500/20">
                            <FileText className="text-white h-6 w-6" />
                        </div>
                        <h3 className="text-white font-bold text-2xl leading-tight mb-2">Unlock the Secrets to <span className="text-orange-500">91% Gross</span></h3>
                        <p className="text-blue-200 text-sm">Join 500+ Owner Operators who have downloaded this guide.</p>
                    </div>
                    <div className="relative z-10">
                         <div className="text-xs text-blue-300/50 uppercase tracking-widest font-mono">Thind Transport LLC</div>
                    </div>
                </div>

                <div className="p-8 md:p-10">
                     <div className="md:hidden mb-6">
                        <h3 className="text-2xl font-black text-slate-900 mb-2">Unlock the Secrets to <span className="text-orange-600">91% Gross</span></h3>
                        <p className="text-slate-500 text-sm">Download the Free Thind Profitability Guide.</p>
                     </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-slate-700 font-bold">First Name</Label>
                            <Input id="name" placeholder="John" className="bg-slate-50 border-slate-200" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-slate-700 font-bold">Email Address</Label>
                            <Input id="email" type="email" placeholder="john@example.com" className="bg-slate-50 border-slate-200" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone" className="text-slate-700 font-bold">Phone Number <span className="text-red-500">*</span></Label>
                            <Input id="phone" type="tel" placeholder="(555) 123-4567" className="bg-slate-50 border-slate-200" required />
                            <p className="text-[10px] text-slate-400">Required for text follow-up.</p>
                        </div>

                        <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-6 text-lg shadow-lg shadow-orange-500/20 mt-2" disabled={loading}>
                            {loading ? "Sending..." : "Get The Guide (Free)"}
                        </Button>
                         <p className="text-xs text-center text-slate-400 mt-4">
                            We respect your inbox. No spam.
                        </p>
                    </form>
                </div>
            </div>
        ) : (
            <div className="p-12 text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="h-10 w-10 text-green-600" />
                </div>
                <h3 className="text-3xl font-black text-slate-900 mb-4">You're All Set!</h3>
                <p className="text-lg text-slate-600 mb-8">
                    Check your email. The Profitability Guide is on its way.
                </p>
                <Button onClick={() => setShowPopup(false)} variant="outline" className="w-full py-6 text-lg border-slate-200 hover:bg-slate-50">
                    Return to Site
                </Button>
                 <div className="mt-6 pt-6 border-t border-slate-100">
                    <Link href="/apply" className="text-orange-600 font-bold flex items-center justify-center gap-2 hover:underline">
                        Ready to apply now? <ArrowRight className="w-4 h-4" />
                    </Link>
                 </div>
            </div>
        )}
        </div>
      </div>
    </div>
  )
}







