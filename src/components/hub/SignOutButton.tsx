"use client"

import { signOut } from "next-auth/react"
import { LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { clearShellCache } from "@/lib/hub/pwa"

export function SignOutButton({ variant = "office" }: { variant?: "office" | "dark" }) {
  const dark = variant === "dark"
  return (
    <button
      onClick={() => {
        clearShellCache()
        signOut({ callbackUrl: "/hub/login" })
      }}
      className={cn(
        "flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold",
        dark
          ? "border-white/20 text-steel-300 hover:bg-white/5 hover:text-white"
          : "border-border-strong text-fg-2 hover:bg-hover"
      )}
    >
      <LogOut className="h-4 w-4" /> Sign out
    </button>
  )
}
