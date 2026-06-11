import Link from "next/link"
import { PRODUCT } from "@/lib/hub/product"
import { Panel } from "@/components/hub/ui"
import { SignupForm } from "@/components/hub/SignupForm"

export const dynamic = "force-dynamic"

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Panel className="w-full max-w-md p-6 md:p-8">
        <div className="text-center mb-6">
          <span className="brand-wordmark text-2xl font-semibold text-white tracking-[0.14em]">
            {PRODUCT.wordmark}
          </span>
          <span className="block text-[11px] font-bold uppercase tracking-[0.3em] text-gold mt-1">
            {PRODUCT.tagline}
          </span>
          <p className="text-body-sm text-steel-200 mt-3">
            Create your company&apos;s workspace — dispatch, money, compliance, and a driver app,
            live in an afternoon. No sales call.
          </p>
        </div>
        <SignupForm />
        <p className="mt-6 text-center text-body-xs text-steel-300">
          Already set up? <Link href="/hub/login" className="text-gold hover:underline">Sign in</Link>
        </p>
      </Panel>
    </div>
  )
}
