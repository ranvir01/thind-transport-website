"use client"

/** Announcement pinned to the driver home until acknowledged (E3). */
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Check, Loader2, Megaphone } from "lucide-react"
import { cn } from "@/lib/utils"
import { driverAcknowledgeAnnouncement } from "@/app/hub/_actions/driver"
import { runOrQueue } from "@/components/hub/driver/offline-queue"
import { SignaturePad } from "@/components/hub/SignaturePad"
import { btnDriverPrimaryCls, btnDriverSecondaryCls } from "@/components/hub/ui"

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
      className="driver-card p-4"
      style={{
        borderColor: "color-mix(in srgb, var(--driver-accent) 30%, transparent)",
        backgroundColor: "color-mix(in srgb, var(--driver-accent) 6%, transparent)",
      }}
    >
      <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[color:var(--driver-accent)]">
        <Megaphone className="h-4 w-4" /> From the office
        {announcement.created_by_name ? ` · ${announcement.created_by_name}` : ""}
      </p>
      <h2 className="mt-1 text-[17px] font-semibold text-white">{announcement.title}</h2>
      <p className="mt-1 whitespace-pre-wrap text-body-sm text-steel-200">{announcement.body}</p>

      {announcement.requires_ack ? (
        <div className="mt-3 space-y-3">
          <SignaturePad onChange={setSignature} height={110} variant="dark" />
          <button
            onClick={ack}
            disabled={pending || !signature}
            className={btnDriverPrimaryCls}
          >
            {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
            Sign & acknowledge
          </button>
        </div>
      ) : (
        <button
          onClick={ack}
          disabled={pending}
          className={cn(btnDriverSecondaryCls, "mt-3 text-[color:var(--driver-accent)]")}
          style={{
            borderColor: "color-mix(in srgb, var(--driver-accent) 50%, transparent)",
            backgroundColor: "color-mix(in srgb, var(--driver-accent) 10%, transparent)",
          }}
        >
          {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
          Got it
        </button>
      )}
    </section>
  )
}
