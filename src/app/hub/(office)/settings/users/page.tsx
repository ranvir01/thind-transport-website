import { requireOwner } from "@/lib/hub/session"
import { listHubUsers } from "@/lib/hub/users"
import { getCarrier, getCarrierSettings } from "@/lib/hub/settings"
import { PageHeader, sectionTitleCls } from "@/components/hub/ui"
import { UserManager } from "@/components/hub/UserManager"
import { CompanyProfilePanel } from "@/components/hub/CompanyProfilePanel"
import { NotificationsPanel } from "@/components/hub/NotificationsPanel"

export const dynamic = "force-dynamic"

export default async function UsersSettingsPage() {
  const owner = await requireOwner()
  const [users, carrier, settings] = await Promise.all([
    listHubUsers(owner.carrierId),
    getCarrier(owner.carrierId),
    getCarrierSettings(owner.carrierId),
  ])

  return (
    <div>
      <PageHeader
        title="Company & users"
        subtitle="Your company profile, alert emails, and who can sign in. Owner only."
      />
      {carrier && (
        <section className="mb-6">
          <h2 className={`${sectionTitleCls} mb-3`}>Company profile</h2>
          <CompanyProfilePanel carrier={carrier} />
        </section>
      )}
      <section className="mb-6">
        <h2 className={`${sectionTitleCls} mb-3`}>Notifications</h2>
        <NotificationsPanel officeEmail={settings.notifications.officeEmail} />
      </section>
      <section>
        <h2 className={`${sectionTitleCls} mb-3`}>Users</h2>
        <UserManager users={users} selfId={owner.id} />
      </section>
    </div>
  )
}
