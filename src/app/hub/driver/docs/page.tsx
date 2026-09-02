import Link from "next/link"
import { FileText } from "lucide-react"
import { requireDriverUser } from "@/lib/hub/session"
import { driverDocuments, driverExpiries } from "@/lib/hub/driver-app"
import { DOCUMENT_KIND_LABELS } from "@/lib/hub/types"
import { DriverExpiryPill } from "@/components/hub/driver/ExpiryPill"
import { EmptyStateDark } from "@/components/hub/driver/EmptyStateDark"
import { btnDriverSecondaryCls } from "@/components/hub/ui"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

export default async function DriverDocsPage() {
  const user = await requireDriverUser()
  const [documents, expiries] = await Promise.all([
    driverDocuments(user.carrierId, user.driverId),
    driverExpiries(user.carrierId, user.driverId),
  ])

  return (
    <div>
      <h1 className="mb-1 text-[22px] font-semibold text-white">My documents</h1>
      <p className="text-body-sm text-steel-300 mb-4">
        What the office has on file for you — and when it runs out.
      </p>

      <div className="driver-card mb-4 space-y-2 p-4">
        <p className="flex min-h-[28px] items-center justify-between gap-3 text-sm text-steel-100">
          <span className="font-semibold text-white">CDL</span> <DriverExpiryPill date={expiries.cdl_expiry} />
        </p>
        <p className="flex min-h-[28px] items-center justify-between gap-3 text-sm text-steel-100">
          <span className="font-semibold text-white">Medical card</span> <DriverExpiryPill date={expiries.medical_card_expiry} />
        </p>
        <p className="text-[13px] text-steel-300">
          Renewing soon? Snap the new card in Messages and the office files it.
        </p>
      </div>

      {documents.length === 0 ? (
        <EmptyStateDark
          title="No files yet."
          hint="The office adds your files here as they come in — CDL, medical card, anything on record."
          icon={<FileText className="h-5 w-5" />}
          action={
            <Link href="/hub/driver/messages" className={cn(btnDriverSecondaryCls, "w-auto px-6")}>
              Send a photo in Messages
            </Link>
          }
        />
      ) : (
        <ul className="hub-stagger space-y-2">
          {documents.map((doc) => (
            <li key={doc.id}>
              <a
                href={doc.url}
                target="_blank"
                rel="noreferrer"
                className="driver-card flex min-h-[56px] items-center gap-3 p-4 transition-colors hover:bg-driver-surface-2"
              >
                <FileText className="h-5 w-5 shrink-0 text-[color:var(--driver-accent)]" />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-white truncate">
                    {DOCUMENT_KIND_LABELS[doc.kind] ?? doc.kind}
                  </span>
                  <span className="block text-[13px] text-steel-300 truncate">{doc.file_name}</span>
                </span>
                {doc.expiry ? <DriverExpiryPill date={doc.expiry} /> : null}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
