"use client"

/** Announcement pinned to the driver home until acknowledged (E3). */
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Check, Loader2, Megaphone } from "lucide-react"
import { driverAcknowledgeAnnouncement } from "@/app/hub/_actions/driver"
import { runOrQueue } from "@/components/hub/driver/offline-queue"
import { SignaturePad } from "@/components/hub/SignaturePad"

export function AnnouncementAckCard({
  announcement,
}: {
  announcement: { id: string; title: string; body: string; requires_ack: boolean; created_by_name: string | null }
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [signature, setSignature] = useState<string | null>(null)

  const ack = () =>
    startTransition(async () => {
      const result = await runOrQueue(
        { kind: "announcement-ack", payload: { announcementId: announcement.id, signature } },
        () => driverAcknowledgeAnnouncement(announcement.id, signature)
      )
      if ("queued" in result && result.queued) {
        toast.success("No signal — saved on your phone, sends automatically")
      } else if (result.ok) {
        toast.success("Acknowledged — the office can see it")
        router.refresh()
      } else toast.error(("error" in result && result.error) || "Could not acknowledge")
    })

  return (
    <section
      className="rounded-2xl border p-4"
      style={{
        borderColor: "color-mix(in srgb, var(--driver-accent) 30%, transparent)",
        backgroundColor: "color-mix(in srgb, var(--driver-accent) 6%, transparent)",
      }}
    >
      <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[color:var(--driver-accent)]">
        <Megaphone className="h-4 w-4" /> From the office
        {announcement.created_by_name ? ` · ${announcement.created_by_name}` : ""}
      </p>
      <h2 className="mt-1 font-display text-base font-extrabold text-white">{announcement.title}</h2>
      <p className="mt-1 text-body-sm text-steel-200 whitespace-pre-wrap">{announcement.body}</p>

      {announcement.requires_ack ? (
        <div className="mt-3 space-y-2">
          <SignaturePad onChange={setSignature} height={110} variant="dark" />
          <button
            onClick={ack}
            disabled={pending || !signature}
            className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-control bg-accent font-display text-sm font-bold uppercase tracking-[0.06em] text-accent-fg hover:bg-accent-hover disabled:opacity-50"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Sign & acknowledge
          </button>
        </div>
      ) : (
        <button
          onClick={ack}
          disabled={pending}
          className="mt-3 flex w-full min-h-[48px] items-center justify-center gap-2 rounded-xl border font-display text-sm font-bold uppercase tracking-[0.06em] text-[color:var(--driver-accent)] hover:bg-white/5 disabled:opacity-60"
          style={{
            borderColor: "color-mix(in srgb, var(--driver-accent) 50%, transparent)",
            backgroundColor: "color-mix(in srgb, var(--driver-accent) 10%, transparent)",
          }}
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Got it
        </button>
      )}
    </section>
  )
}
