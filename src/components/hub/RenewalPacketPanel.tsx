"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { FileDown, Loader2 } from "lucide-react"
import { generateRenewalPacketAction } from "@/app/hub/_actions/compliance"
import { Panel } from "@/components/hub/ui"

/**
 * One click assembles the underwriting submission LoadOff already holds —
 * fleet, drivers, IFTA mileage, loss history, DVIR/maintenance posture — as
 * a dated PDF. The renewal premium is priced off the submission in front of
 * the underwriter; start this 90–120 days before the policy renews.
 */
export function RenewalPacketPanel({
  latest,
}: {
  latest: { url: string; file_name: string; created_at: string } | null
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [justBuilt, setJustBuilt] = useState<{ url: string; fileName: string } | null>(null)

  const generate = () => {
    startTransition(async () => {
      const result = await generateRenewalPacketAction()
      if (result.ok && result.url) {
        setJustBuilt({ url: result.url, fileName: result.fileName ?? "renewal packet" })
        toast.success("Renewal packet generated")
        router.refresh()
      } else {
        toast.error(result.error ?? "Could not generate the packet")
      }
    })
  }

  const current = justBuilt ?? (latest ? { url: latest.url, fileName: latest.file_name } : null)

  return (
    <Panel className="p-4 md:p-5">
      <h3 className="text-sm font-semibold">Insurance renewal packet</h3>
      <p className="mt-1 text-body-sm text-fg-2">
        Everything an underwriter asks for that LoadOff already knows — fleet with VINs,
        drivers with CDL and med-card dates, IFTA-measured miles, incidents, DVIR and
        maintenance posture — as one dated PDF. Add loss runs and your current dec pages,
        and the submission is complete. Start 90–120 days before renewal.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={generate}
          disabled={pending}
          className="flex min-h-[44px] items-center justify-center gap-2 rounded-control bg-accent px-6 font-semibold text-sm text-accent-fg hover:bg-accent-hover disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
          {pending ? "Assembling…" : "Generate packet"}
        </button>
        {current ? (
          <a
            href={current.url}
            className="text-sm font-medium text-accent underline underline-offset-2"
            download={current.fileName}
          >
            Download {current.fileName}
          </a>
        ) : null}
      </div>
      {latest && !justBuilt ? (
        <p className="mt-2 text-body-xs text-fg-3">
          Last generated {String(latest.created_at).slice(0, 10)}.
        </p>
      ) : null}
    </Panel>
  )
}
