"use client"

import { useState, useTransition } from "react"
import { signIn } from "next-auth/react"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { acceptDriverInviteAction } from "@/app/hub/_actions/onboarding"
import { fieldDarkCls, labelDarkCls } from "@/components/hub/ui"

export function DriverInviteAcceptForm({ token, email }: { token: string; email: string }) {
  const [pending, startTransition] = useTransition()
  const [password, setPassword] = useState("")

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const result = await acceptDriverInviteAction(token, { password })
      if (!result.ok) {
        toast.error(result.error ?? "Could not create the account")
        return
      }
      const signin = await signIn("credentials", { email, password, redirect: false })
      if (signin?.ok) window.location.href = "/hub/driver"
      else window.location.href = "/hub/login"
    })
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label htmlFor="inv-pass" className={labelDarkCls}>Choose a password (8+ characters)</label>
        <input
          id="inv-pass" required type="password" minLength={8} className={fieldDarkCls} autoComplete="new-password"
          value={password} onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <button
        type="submit" disabled={pending}
        className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-control bg-accent font-semibold text-sm text-accent-fg hover:bg-accent-hover disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Open my driver app
      </button>
    </form>
  )
}
