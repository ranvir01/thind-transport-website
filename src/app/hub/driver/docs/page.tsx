import { FileText } from "lucide-react"
import { requireDriverUser } from "@/lib/hub/session"
import { driverDocuments, driverExpiries } from "@/lib/hub/driver-app"
import { DOCUMENT_KIND_LABELS } from "@/lib/hub/types"
import { ExpiryPill } from "@/components/hub/ui"

export const dynamic = "force-dynamic"

export default async function DriverDocsPage() {
  const user = await requireDriverUser()
  const [documents, expiries] = await Promise.all([
    driverDocuments(user.driverId),
    driverExpiries(user.carrierId, user.driverId),
  ])

  return (
    <div>
      <h1 className="font-display text-xl font-extrabold uppercase tracking-wide text-white mb-1">My documents</h1>
      <p className="text-body-sm text-steel-300 mb-4">
        What the office has on file for you — and when it runs out.
      </p>

      <div className="rounded-2xl border border-white/10 bg-navy-800/80 p-4 mb-4 space-y-2">
        <p className="flex items-center justify-between text-sm text-steel-100">
          <span className="font-semibold text-white">CDL</span> <ExpiryPill date={expiries.cdl_expiry} />
        </p>
        <p className="flex items-center justify-between text-sm text-steel-100">
          <span className="font-semibold text-white">Medical card</span> <ExpiryPill date={expiries.medical_card_expiry} />
        </p>
        <p className="text-body-xs text-steel-400">
          Renewing soon? Snap the new card in Messages and the office files it.
        </p>
      </div>

      {documents.length === 0 ? (
        <p className="text-body-sm text-steel-300">No files yet.</p>
      ) : (
        <ul className="space-y-2">
          {documents.map((doc) => (
            <li key={doc.id}>
              <a
                href={doc.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-navy-800/80 p-4 hover:bg-white/5"
              >
                <FileText className="h-5 w-5 shrink-0 text-gold" />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-white truncate">
                    {DOCUMENT_KIND_LABELS[doc.kind] ?? doc.kind}
                  </span>
                  <span className="block text-body-xs text-steel-300 truncate">{doc.file_name}</span>
                </span>
                {doc.expiry ? <ExpiryPill date={doc.expiry} /> : null}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
