"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, Megaphone } from "lucide-react"
import { createAnnouncementAction } from "@/app/hub/_actions/comms"
import { fieldCls, labelCls, Panel } from "@/components/hub/ui"

export function AnnouncementComposer() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState({
    title: "",
    body: "",
    audience: "drivers" as "all" | "drivers" | "office",
    requiresAck: true,
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const result = await createAnnouncementAction(form)
      if (result.ok) {
        toast.success("Announcement sent — everyone targeted gets an alert")
        setForm({ title: "", body: "", audience: "drivers", requiresAck: true })
        router.refresh()
      } else toast.error(result.error ?? "Could not send")
    })
  }

  return (
    <Panel className="p-4 md:p-5">
      <h2 className="font-display text-base font-bold uppercase tracking-wide text-white mb-3">
        New announcement
      </h2>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label htmlFor="ann-title" className={labelCls}>Title</label>
          <input
            id="ann-title" required className={fieldCls}
            placeholder="Winter chain policy / Holiday schedule / Safety bulletin…"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor="ann-body" className={labelCls}>Message</label>
          <textarea
            id="ann-body" rows={4} required className={fieldCls}
            placeholder="Plain words. Drivers read this on a phone in a parking lot."
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="ann-audience" className={labelCls}>Who sees it</label>
            <select
              id="ann-audience" className={fieldCls} value={form.audience}
              onChange={(e) => setForm({ ...form, audience: e.target.value as typeof form.audience })}
            >
              <option value="drivers">All drivers</option>
              <option value="office">Office staff</option>
              <option value="all">Everyone</option>
            </select>
          </div>
          <label className="flex items-end gap-2 pb-1 cursor-pointer min-h-[44px]">
            <input
              type="checkbox"
              checked={form.requiresAck}
              onChange={(e) => setForm({ ...form, requiresAck: e.target.checked })}
              className="h-5 w-5 rounded border-white/20 accent-orange"
            />
            <span className="text-sm font-semibold text-white">
              Require a signed acknowledgement
              <span className="block text-body-xs font-normal text-steel-300">
                Pins it to their home screen until they sign
              </span>
            </span>
          </label>
        </div>
        <button
          type="submit" disabled={pending}
          className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-orange px-6 font-display text-sm font-bold uppercase tracking-[0.08em] text-white shadow-cta hover:bg-orange-400 disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />}
          Send announcement
        </button>
      </form>
    </Panel>
  )
}
