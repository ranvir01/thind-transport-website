import { PreQualificationForm } from "@/components/application/PreQualificationForm"
import { PageBreadcrumb } from "@/components/shared/PageBreadcrumb"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Driver Pre-Qualification | Thind Transport",
  description: "Check your eligibility for Thind Transport driver positions. Quick and secure pre-qualification form.",
}

export default function PreQualifyPage() {
  return (
    <div className="min-h-screen bg-[#00060D] pb-20">
      <PageBreadcrumb pageName="Pre-Qualification" category="Drivers" />
      
      <div className="container max-w-4xl mx-auto px-4 -mt-20 relative z-10">
        <PreQualificationForm />
      </div>
    </div>
  )
}

