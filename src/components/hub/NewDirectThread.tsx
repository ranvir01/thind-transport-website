"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, MessageSquarePlus } from "lucide-react"
import { openThread } from "@/app/hub/_actions/messages"
import { fieldCls } from "@/components/hub/ui"

export function NewDirectThread({ drivers }: { drivers: { id: string; name: string }[] }) {
  const router = useRouter()
  const [driverId, setDriverId] = useState("")
  const [pending, startTransition] = useTransition()

  const open = () => {
    if (!driverId) return
    startTransition(async () => {
      const result = await openThread({ driverId })
      if (result.ok && result.threadId) router.push(`/hub/messages/${result.threadId}`)
      else toast.error(result.error ?? "Could not open the conversation")
    })
  }

  return (
    <div className="flex gap-2">
      <select
        aria-label="Pick a driver to message"
        className={fieldCls}
        value={driverId}
        onChange={(e) => setDriverId(e.target.value)}
      >
        <option value="">Message a driver…</option>
        {drivers.map((d) => (
          <option key={d.id} value={d.id}>{d.name}</option>
        ))}
      </select>
      <button
        onClick={open}
        disabled={pending || !driverId}
        className="flex min-h-[48px] shrink-0 items-center gap-2 rounded-xl bg-orange px-4 font-display text-sm font-bold uppercase tracking-[0.06em] text-white shadow-cta hover:bg-orange-400 disabled:opacity-50"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquarePlus className="h-4 w-4" />}
        Open
      </button>
    </div>
  )
}
