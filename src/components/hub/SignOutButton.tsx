"use client"

import { signOut } from "next-auth/react"
import { LogOut } from "lucide-react"
import { btnDriverSecondaryCls } from "@/components/hub/ui"
import { clearShellCache } from "@/lib/hub/pwa"

export function SignOutButton({ variant = "office" }: { variant?: "office" | "dark" }) {
  const dark = variant === "dark"
  return (
    <button
      onClick={() => {
        clearShellCache()
        signOut({ callbackUrl: "/hub/login" })
      }}
      className={
        // The forced-dark surfaces take the shared quiet secondary (56px, white
        // outline); the office keeps its own 44px outline on the mode tokens.
        dark
          ? btnDriverSecondaryCls
          : "flex w-full min-h-[44px] items-center justify-center gap-2 rounded-control border border-border-strong px-4 py-2.5 text-sm font-semibold text-fg-2 hover:bg-hover"
      }
    >
      <LogOut className="h-4 w-4" /> Sign out
    </button>
  )
}
