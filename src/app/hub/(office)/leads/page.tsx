import { requireOfficeUser } from "@/lib/hub/session"
import { listWebsiteLeads } from "@/lib/hub/website-leads"
import { PageHeader, Panel } from "@/components/hub/ui"
import { LeadRow } from "@/components/hub/LeadRow"

export const dynamic = "force-dynamic"

/**
 * Drivers who raised their hand on the website. Every row was a real person
 * on thindtransport.com who typed their name and phone number — the only
 * thing that converts them is a call back within the hour.
 */
export default async function LeadsPage() {
  const user = await requireOfficeUser()
  const leads = await listWebsiteLeads(user.carrierId).catch(() => [])
  const fresh = leads.filter((lead) => lead.status === "new").length

  return (
    <div>
      <PageHeader
        title="Driver leads"
        subtitle={
          fresh > 0
            ? `${fresh} new lead${fresh === 1 ? "" : "s"} from the website — speed to lead wins drivers, call today.`
            : "Everyone who reached out on the website lands here the moment they hit submit."
        }
      />
      <Panel className="divide-y divide-border">
        {leads.length === 0 ? (
          <p className="p-4 text-body-sm text-fg-3">
            No website leads yet. Every apply-form start and contact form on
            thindtransport.com lands here automatically — nothing to set up.
          </p>
        ) : (
          leads.map((lead) => <LeadRow key={lead.id} lead={lead} />)
        )}
      </Panel>
    </div>
  )
}
