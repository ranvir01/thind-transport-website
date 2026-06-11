"use client"

import { signOut } from "next-auth/react"
import { LogOut } from "lucide-react"

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/hub/login" })}
      className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-steel-100 hover:bg-white/5"
    >
      <LogOut className="h-4 w-4" /> Sign out
    </button>
  )
}
