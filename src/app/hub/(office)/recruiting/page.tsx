import { requireOfficeUser } from "@/lib/hub/session"
import { listApplicants } from "@/lib/hub/recruiting"
import { PageHeader } from "@/components/hub/ui"
import {
  AddApplicantForm, ImportApplicantsButton, RecruitingBoard,
} from "@/components/hub/RecruitingBoard"

export const dynamic = "force-dynamic"

export default async function RecruitingPage() {
  const user = await requireOfficeUser()
  const applicants = await listApplicants(user.carrierId)

  return (
    <div>
      <PageHeader
        title="Recruiting"
        subtitle="Application to dispatch-legal driver, all in one place — drag between stages."
        action={<ImportApplicantsButton />}
      />
      <div className="mb-4">
        <AddApplicantForm />
      </div>
      <RecruitingBoard applicants={applicants} />
    </div>
  )
}
