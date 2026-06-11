import { requireOwner } from "@/lib/hub/session"
import { listHubUsers } from "@/lib/hub/users"
import { PageHeader } from "@/components/hub/ui"
import { UserManager } from "@/components/hub/UserManager"

export const dynamic = "force-dynamic"

export default async function UsersSettingsPage() {
  const owner = await requireOwner()
  const users = await listHubUsers(owner.carrierId)

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle="Who can sign in, and what they see. Owner only."
      />
      <UserManager users={users} selfId={owner.id} />
    </div>
  )
}
