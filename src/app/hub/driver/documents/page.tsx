import Link from "next/link"
import { redirect } from "next/navigation"
import { FileText, UploadCloud } from "lucide-react"
import { getHubUser } from "@/lib/hub/session"
import { DriverBottomTabs } from "@/components/hub/DriverBottomTabs"

export const dynamic = "force-dynamic"

const docs = [
  { name: "Rate confirmation", status: "On file", required: true },
  { name: "Bill of lading", status: "On file", required: true },
  { name: "POD", status: "Needed at delivery", required: true },
  { name: "Lumper receipt", status: "Optional", required: false },
]

export default async function DriverDocumentsPage() {
  const user = await getHubUser()
  if (!user) redirect("/hub/login")

  return (
    <main className="min-h-screen bg-navy px-4 pb-28 pt-5 text-white">
      <div className="mx-auto max-w-[430px]">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-gold">
              {user.dataMode === "sandbox" ? "SANDBOX DRIVER" : "Driver app"}
            </p>
            <h1 className="mt-1 font-display text-2xl font-extrabold uppercase tracking-wide text-white">Documents</h1>
            <p className="mt-1 text-sm text-steel-200">Load paperwork and upload checklist.</p>
          </div>
          <Link href="/hub/driver" className="rounded-xl border border-white/15 px-3 py-2 text-xs font-bold text-steel-100">
            Load
          </Link>
        </div>

        <section className="space-y-3">
          {docs.map((doc) => (
            <div key={doc.name} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 shrink-0 text-gold" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-white">{doc.name}</p>
                  <p className="text-sm text-steel-200">{doc.status}</p>
                </div>
                {doc.required ? (
                  <span className="rounded-full border border-gold/40 bg-gold/15 px-2.5 py-1 text-[10px] font-black uppercase text-gold">
                    Required
                  </span>
                ) : null}
              </div>
            </div>
          ))}
        </section>

        <button className="mt-4 flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-orange px-5 font-display text-base font-bold uppercase tracking-[0.08em] text-white shadow-cta">
          <UploadCloud className="h-5 w-5" /> Upload document
        </button>
        <p className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-steel-100">
          Offline mode: uploads show “Saved — will sync” once the production queue is connected.
        </p>
      </div>
      <DriverBottomTabs />
    </main>
  )
}
