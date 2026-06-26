import { SetupGuide } from "@/components/hub/SetupGuide"
import { requireOfficeUser } from "@/lib/hub/session"
import { gettingStartedState } from "@/app/hub/_actions/onboarding"

export const dynamic = "force-dynamic"

export default async function SetupGuidePage() {
  await requireOfficeUser()
  const progress = await gettingStartedState()

  return (
    <div className="max-w-3xl">
      <SetupGuide progress={progress ?? undefined} />
    </div>
  )
}
