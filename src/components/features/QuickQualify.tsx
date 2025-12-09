"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle2, XCircle, Truck, ShieldCheck, MapPin, Clock, DollarSign, GraduationCap, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export const QuickQualify = () => {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<boolean[]>([])
  const [qualified, setQualified] = useState(false)
  
  // More detailed questions with specific context
  const questions = [
    {
        id: 1,
        question: "Do you hold a valid CDL Class A License?",
        subtext: "We verify all licenses through FMCSA clearinghouse.",
        icon: <GraduationCap className="w-12 h-12 text-blue-500 mb-4" />
    },
    {
        id: 2,
        question: "Do you have at least 2 years of OTR experience?",
        subtext: "Our insurance requires 24 months of verifiable experience for top-tier pay.",
        icon: <Clock className="w-12 h-12 text-blue-500 mb-4" />
    },
    {
        id: 3,
        question: "Is your MVR clean (No major accidents in 3 years)?",
        subtext: "We prioritize safety. Minor tickets may be acceptable.",
        icon: <ShieldCheck className="w-12 h-12 text-blue-500 mb-4" />
    },
    {
        id: 4,
        question: "Are you willing to drive OTR (Over The Road)?",
        subtext: "Most routes are 10-14 days out. Regional options available in WA/OR.",
        icon: <MapPin className="w-12 h-12 text-blue-500 mb-4" />
    }
  ]

  const handleAnswer = (answer: boolean) => {
    const newAnswers = [...answers, answer]
    setAnswers(newAnswers)

    // Logic: If they answer NO to the first question (License), immediate fail.
    // If they answer NO to experience but YES to license, they might qualify for training (different outcome).
    // For now, we keep it simple but robust: Needs License + Clean MVR.
    
    if (step < questions.length - 1) {
        setStep(step + 1)
    } else {
        // Evaluate qualification
        const hasLicense = newAnswers[0]
        const hasExperience = newAnswers[1]
        const cleanMVR = newAnswers[2]
        
        if (hasLicense && cleanMVR && hasExperience) {
            setQualified(true)
        } else {
            setQualified(false)
        }
        setStep(questions.length)
    }
  }

  return (
    <section className="py-24 bg-gradient-to-b from-white to-slate-50">
        <div className="container max-w-4xl mx-auto">
            <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 text-blue-700 font-bold text-sm mb-4">
                    <Clock className="w-4 h-4" /> 30-Second Pre-Check
                </div>
                <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-4">
                    See If You Qualify For <span className="text-green-600">Top Tier Pay</span>
                </h2>
                <p className="text-xl text-slate-600 max-w-2xl mx-auto">
                    Answer 4 simple questions to unlock priority application status. No commitment required.
                </p>
            </div>

            <div className="bg-white rounded-3xl p-8 md:p-12 min-h-[450px] flex items-center justify-center relative overflow-hidden border border-slate-200 shadow-2xl shadow-slate-200/50">
                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none opacity-50"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-50 rounded-full blur-3xl -ml-32 -mb-32 pointer-events-none opacity-50"></div>

                <AnimatePresence mode="wait">
                    {step < questions.length && (
                        <motion.div 
                            key={step}
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            className="text-center w-full max-w-xl relative z-10"
                        >
                            <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-sm border border-blue-100">
                                {questions[step].icon}
                            </div>
                            
                            <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">
                                {questions[step].question}
                            </h3>
                            <p className="text-slate-600 mb-10 text-lg">
                                {questions[step].subtext}
                            </p>

                            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                                <Button 
                                    onClick={() => handleAnswer(true)}
                                    className="bg-slate-900 hover:bg-slate-800 text-white h-auto py-6 text-xl rounded-xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
                                >
                                    Yes
                                </Button>
                                <Button 
                                    onClick={() => handleAnswer(false)}
                                    variant="outline"
                                    className="border-slate-200 hover:bg-slate-50 text-slate-600 h-auto py-6 text-xl rounded-xl transition-all"
                                >
                                    No
                                </Button>
                            </div>
                            
                            <div className="mt-12 flex justify-center gap-2">
                                {questions.map((_, i) => (
                                    <div 
                                        key={i} 
                                        className={`h-1.5 rounded-full transition-all duration-300 ${
                                            i === step ? 'w-8 bg-blue-600' : 
                                            i < step ? 'w-8 bg-green-500' : 'w-2 bg-slate-200'
                                        }`} 
                                    />
                                ))}
                            </div>
                            <p className="text-xs text-slate-500 mt-4">Question {step + 1} of {questions.length}</p>
                        </motion.div>
                    )}

                    {step === questions.length && qualified && (
                         <motion.div 
                            key="qualified"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center relative z-10"
                         >
                            <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8 ring-8 ring-green-50 shadow-xl">
                                <CheckCircle2 className="w-12 h-12" />
                            </div>
                            <h3 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">
                                YOU ARE PRE-QUALIFIED!
                            </h3>
                            <div className="bg-green-50 border border-green-100 rounded-xl p-6 mb-8 max-w-md mx-auto">
                                <p className="text-green-800 font-medium mb-2">Based on your answers, you are eligible for:</p>
                                <ul className="space-y-2 text-left text-green-900 font-bold">
                                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> $1,500 - $2,500 Sign-On Bonus</li>
                                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Immediate Orientation Scheduling</li>
                                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Premium Equipment Assignment</li>
                                </ul>
                            </div>
                            <Link href="/apply">
                                <Button className="bg-orange-500 hover:bg-orange-600 text-white px-12 py-8 text-xl font-bold rounded-full shadow-xl shadow-orange-500/30 animate-pulse hover:scale-105 transition-transform">
                                    Start Priority Application →
                                </Button>
                            </Link>
                            <p className="text-sm text-slate-600 mt-4">Takes 2 minutes. No account needed.</p>
                         </motion.div>
                    )}

                    {step === questions.length && !qualified && (
                         <motion.div 
                            key="unqualified"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center relative z-10"
                         >
                             <div className="w-24 h-24 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-8 ring-8 ring-orange-50">
                                <AlertTriangle className="w-12 h-12" />
                            </div>
                            <h3 className="text-3xl font-bold text-slate-900 mb-4">
                                We'd Still Like to Talk
                            </h3>
                            <p className="text-lg text-slate-600 mb-8 max-w-md mx-auto leading-relaxed">
                                While you may not meet our <strong>Owner Operator</strong> requirements yet, we often have positions for Company Drivers or training opportunities.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Link href="/apply">
                                    <Button className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-xl w-full sm:w-auto">
                                        Apply Anyway
                                    </Button>
                                </Link>
                                <a href="tel:+12067659218">
                                     <Button variant="outline" className="px-8 py-4 rounded-xl w-full sm:w-auto border-slate-300 hover:bg-slate-50">
                                        Talk to a Recruiter
                                    </Button>
                                </a>
                            </div>
                         </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    </section>
  )
}
