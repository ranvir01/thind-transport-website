import { requireOfficeUser } from "@/lib/hub/session"
import { listApplicants, syncPublicApplicantsOnRecruitingLoad } from "@/lib/hub/recruiting"
import { PageHeader } from "@/components/hub/ui"
import {
  AddApplicantForm, ImportApplicantsButton, RecruitingBoard,
} from "@/components/hub/RecruitingBoard"

export const dynamic = "force-dynamic"

export default async function RecruitingPage() {
  const user = await requireOfficeUser()
  const { imported } = await syncPublicApplicantsOnRecruitingLoad(user)
  const applicants = await listApplicants(user.carrierId)

  return (
    <div>
      <PageHeader
        title="Recruiting"
        subtitle="Application to dispatch-legal driver, all in one place — drag between stages."
        action={<ImportApplicantsButton />}
      />
      {imported > 0 ? (
        <p
          role="status"
          className="mb-4 rounded-card border border-border bg-surface px-4 py-3 text-sm text-fg"
        >
          Pulled {imported} new website application{imported === 1 ? "" : "s"} automatically.
        </p>
      ) : null}
      <div className="mb-4">
        <AddApplicantForm />
      </div>
      <RecruitingBoard applicants={applicants} />
    </div>
  )
}
