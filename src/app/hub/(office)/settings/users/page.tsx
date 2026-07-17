import { requireOwner } from "@/lib/hub/session"
import { listHubUsers } from "@/lib/hub/users"
import { getCarrier } from "@/lib/hub/settings"
import { PageHeader, sectionTitleCls } from "@/components/hub/ui"
import { UserManager } from "@/components/hub/UserManager"
import { CompanyProfilePanel } from "@/components/hub/CompanyProfilePanel"

export const dynamic = "force-dynamic"

export default async function UsersSettingsPage() {
  const owner = await requireOwner()
  const [users, carrier] = await Promise.all([
    listHubUsers(owner.carrierId),
    getCarrier(owner.carrierId),
  ])

  return (
    <div>
      <PageHeader
        title="Company & users"
        subtitle="Your company profile, and who can sign in. Owner only."
      />
      {carrier && (
        <section className="mb-6">
          <h2 className={`${sectionTitleCls} mb-3`}>Company profile</h2>
          <CompanyProfilePanel carrier={carrier} />
        </section>
      )}
      <section>
        <h2 className={`${sectionTitleCls} mb-3`}>Users</h2>
        <UserManager users={users} selfId={owner.id} />
      </section>
    </div>
  )
}
