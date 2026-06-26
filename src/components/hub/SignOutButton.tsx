"use client"

import { signOut } from "next-auth/react"
import { LogOut } from "lucide-react"

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/hub/login" })}
      className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl border border-border-strong px-4 py-2.5 text-sm font-semibold text-fg-2 hover:bg-hover"
    >
      <LogOut className="h-4 w-4" /> Sign out
    </button>
  )
}
