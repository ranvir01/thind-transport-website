"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { toast } from "sonner"
import { Loader2, LogIn } from "lucide-react"
import { fieldCls, labelCls, Panel } from "@/components/hub/ui"

export default function HubLoginPage() {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ email: "", password: "" })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const result = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      })
      if (result?.ok) {
        // Full navigation so the proxy routes each role to the right place.
        window.location.href = "/hub"
      } else {
        toast.error("Invalid email or password")
        setLoading(false)
      }
    } catch {
      toast.error("Something went wrong. Please try again.")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Panel className="w-full max-w-md p-6 md:p-8">
        <div className="text-center mb-6">
          <span className="brand-wordmark text-2xl font-semibold text-white tracking-[0.14em]">THIND</span>
          <span className="block text-[11px] font-bold uppercase tracking-[0.3em] text-gold mt-1">
            Transport Hub
          </span>
          <p className="text-body-sm text-steel-200 mt-3">
            One login for dispatch, drivers, and partners.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className={labelCls}>Email</label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              className={fieldCls}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="password" className={labelCls}>Password</label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              className={fieldCls}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-xl bg-orange font-display text-sm font-bold uppercase tracking-[0.08em] text-white shadow-cta transition-all hover:bg-orange-400 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-body-xs text-steel-300">
          Need access? Ask the office to create your account.
        </p>
      </Panel>
    </div>
  )
}
