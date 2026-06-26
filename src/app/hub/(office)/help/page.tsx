import { HelpCenter } from "@/components/hub/HelpCenter"
import { requireOfficeUser } from "@/lib/hub/session"

export const dynamic = "force-dynamic"

export default async function HelpPage() {
  await requireOfficeUser()
  return <HelpCenter />
}
