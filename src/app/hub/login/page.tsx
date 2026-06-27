"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { toast } from "sonner"
import { Loader2, LogIn } from "lucide-react"
import { btnPrimaryCls, fieldCls, labelCls, linkAccentCls, Panel } from "@/components/hub/ui"
import { PRODUCT } from "@/lib/hub/product"

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
    <div className="hauldesk-auth flex min-h-screen items-center justify-center p-4">
      <Panel className="w-full max-w-md p-6 md:p-8">
        <div className="mb-6 text-center">
          <span className="text-2xl font-semibold tracking-tight text-fg">{PRODUCT.name}</span>
          <span className="mt-1 block text-sm text-fg-3">{PRODUCT.tagline}</span>
          <p className="mt-3 text-sm text-fg-2">One login for dispatch, drivers, and partners.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className={labelCls}>
              Email
            </label>
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
            <label htmlFor="password" className={labelCls}>
              Password
            </label>
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
          <button type="submit" disabled={loading} className={`w-full ${btnPrimaryCls}`}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-fg-3">Need access? Ask the office to create your account.</p>

        <Panel className="mt-4 border-dashed bg-surface-2 p-3 text-left">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-fg-3">Demo access</p>
          <p className="mt-1 text-xs text-fg-2">
            <span className="font-mono text-fg">dispatch@demo.thind</span>
            {" · "}
            <span className="font-mono text-fg">ThindDemo1!</span>
          </p>
          <p className="mt-1 text-[11px] text-fg-3">
            Also try owner@demo.thind, driver@demo.thind — same password.
          </p>
        </Panel>

        <p className="mt-4 text-center text-xs text-fg-3">
          Run a trucking company?{" "}
          <a href="/hub/signup" className={linkAccentCls}>
            Create your workspace
          </a>
        </p>
      </Panel>
    </div>
  )
}
