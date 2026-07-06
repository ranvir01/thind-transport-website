"use client"

import { useEffect, useState } from "react"
import { signIn, getSession } from "next-auth/react"
import { toast } from "sonner"
import { Loader2, LogIn } from "lucide-react"
import { btnPrimaryCls, fieldCls, labelCls, linkAccentCls, Panel } from "@/components/hub/ui"
import { PRODUCT } from "@/lib/hub/product"
import { postLoginPath } from "@/lib/hub/landing"

/** Session fetch can race signIn; retry before we pick the landing route. */
async function sessionAfterLogin() {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const session = await getSession({ broadcast: false })
      if (session) return session
      const res = await fetch("/api/auth/session")
      if (res.ok) {
        const data = (await res.json()) as { user?: { role?: string } }
        if (data?.user) return data
      }
    } catch {
      // transient authjs fetch abort — retry
    }
    await new Promise((r) => setTimeout(r, 100 * (attempt + 1)))
  }
  return null
}

/** Client login card. `showDemo` comes from the server page (HUB_DEMO_LOGIN). */
export function LoginCard({ showDemo }: { showDemo: boolean }) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ email: "", password: "" })
  const [roleHint, setRoleHint] = useState<string | null>(null)

  const displayRoleHint = form.email.trim().includes("@") ? roleHint : null

  useEffect(() => {
    const email = form.email.trim()
    if (!email.includes("@")) return
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/hub/role-hint?email=${encodeURIComponent(email)}`)
        const data = (await res.json()) as { label?: string | null }
        setRoleHint(data.label ?? null)
      } catch {
        setRoleHint(null)
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [form.email])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const result = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      })
      if (result?.error || !result?.ok) {
        toast.error("Invalid email or password")
        setLoading(false)
        return
      }

      const session = await sessionAfterLogin()
      const role = (session?.user as { role?: string } | undefined)?.role
      window.location.assign(postLoginPath(role))
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
            <div className="relative">
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                className={fieldCls}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              {displayRoleHint ? (
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-border bg-surface-2 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-fg-2">
                  {displayRoleHint}
                </span>
              ) : null}
            </div>
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

        {showDemo ? (
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
        ) : null}

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
