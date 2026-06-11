"use client"

import { useState, useTransition } from "react"
import { signIn } from "next-auth/react"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { acceptInvitationAction } from "@/app/hub/_actions/portal"
import { fieldCls, labelCls } from "@/components/hub/ui"

export function AcceptInvitationForm({ token, email }: { token: string; email: string }) {
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState({ name: "", password: "" })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const result = await acceptInvitationAction(token, form)
      if (!result.ok) {
        toast.error(result.error ?? "Could not create the account")
        return
      }
      const signin = await signIn("credentials", { email, password: form.password, redirect: false })
      if (signin?.ok) window.location.href = "/hub/portal"
      else window.location.href = "/hub/login"
    })
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label htmlFor="acc-name" className={labelCls}>Your name</label>
        <input
          id="acc-name" required className={fieldCls} autoComplete="name"
          value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </div>
      <div>
        <label htmlFor="acc-pass" className={labelCls}>Choose a password (8+ characters)</label>
        <input
          id="acc-pass" required type="password" minLength={8} className={fieldCls} autoComplete="new-password"
          value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
      </div>
      <button
        type="submit" disabled={pending}
        className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-xl bg-orange font-display text-sm font-bold uppercase tracking-[0.08em] text-white shadow-cta hover:bg-orange-400 disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Create my access
      </button>
    </form>
  )
}
