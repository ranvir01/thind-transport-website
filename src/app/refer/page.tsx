import { Metadata } from "next"
import { ExternalLink } from "lucide-react"
import { COMPANY_INFO, PAY_RATES } from "@/lib/constants"
import { PageBreadcrumb } from "@/components/shared/PageBreadcrumb"
import { RelatedLinks } from "@/components/shared/RelatedLinks"
import { RecruitingCtas } from "@/components/shared/RecruitingCtas"
import { driverLinks } from "@/components/shared/link-sets"
import { QrCode } from "@/components/hub/QrCode"
import { CopyPostButton } from "@/components/application/CopyPostButton"
import {
  freeHiringChannels,
  recruitingPosts,
  recruitingShareTags,
  taggedApplyPath,
  taggedApplyUrl,
} from "@/lib/recruiting-posts"

export const metadata: Metadata = recruitingShareTags({
  title: `Send this job | ${COMPANY_INFO.name}`,
  description: `Copy-paste posts, QR codes, and free channels to hire CDL-A company drivers and owner-operators for ${COMPANY_INFO.name} in ${COMPANY_INFO.location}. Company ${PAY_RATES.companyDriver.local.perMile}/mile · owner-operators keep ${PAY_RATES.ownerOperator.commission} of gross.`,
  path: "/refer",
})

export default function ReferPage() {
  const posts = recruitingPosts()
  const channels = freeHiringChannels()
  const qrApply = taggedApplyUrl("qr_print")
  const qrTel = `tel:${COMPANY_INFO.phoneFormatted}`

  return (
    <div className="brand-page-shell min-h-screen bg-[#060607] text-white">
      <PageBreadcrumb pageName="Send this job" category="Drivers" />

      <section className="container px-4 py-12 md:py-16">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-400">
          Free hiring kit · no Indeed budget required
        </p>
        <h1 className="mt-3 max-w-3xl font-display text-4xl font-black md:text-5xl">
          Know a driver? Send them our number.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-300">
          Word of mouth hires in this community. Arm the people already on the
          team: copy a post, scan a QR, or tap to call. Pay is{" "}
          {PAY_RATES.companyDriver.local.perMile}/mile company and{" "}
          {PAY_RATES.ownerOperator.commission} owner-op — the same numbers as
          /pay-rates.
        </p>

        <RecruitingCtas
          applyHref={taggedApplyPath("refer_page")}
          applyLabel="I want to apply"
          primary="call"
        />

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <figure className="rounded-2xl border border-white/10 bg-white p-6 text-[#0E1621]">
            <QrCode value={qrApply} label="Apply QR code" className="mx-auto h-48 w-48" />
            <figcaption className="mt-4 text-center text-sm font-semibold">
              Scan to apply · tape this in the yard or the truck
            </figcaption>
          </figure>
          <figure className="rounded-2xl border border-white/10 bg-white p-6 text-[#0E1621]">
            <QrCode value={qrTel} label="Call QR code" className="mx-auto h-48 w-48" />
            <figcaption className="mt-4 text-center text-sm font-semibold">
              Scan to call {COMPANY_INFO.phone}
            </figcaption>
          </figure>
        </div>

        <h2 className="mt-16 font-display text-3xl font-black">Paste-ready posts</h2>
        <p className="mt-2 max-w-2xl text-slate-400">
          English masters. Punjabi copy only after a family translator reviews
          it — do not run these through Google Translate.
        </p>

        <div className="mt-8 space-y-6">
          {posts.map((post) => (
            <article
              key={post.id}
              className="rounded-2xl border border-white/10 bg-[#0B0C0E] p-5 md:p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-white">{post.title}</h3>
                  <p className="mt-1 text-sm text-slate-400">{post.channel}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-orange-400">
                    {post.cost}
                  </p>
                </div>
                <CopyPostButton text={post.body} label="Copy post" />
              </div>
              <p className="mt-3 text-sm text-slate-400">{post.how}</p>
              <pre className="mt-4 overflow-x-auto whitespace-pre-wrap rounded-xl bg-black/40 p-4 text-sm leading-relaxed text-slate-200 select-all">
                {post.body}
              </pre>
            </article>
          ))}
        </div>

        <h2 className="mt-16 font-display text-3xl font-black">Where to post this week</h2>
        <ul className="mt-6 grid list-none gap-3 md:grid-cols-2">
          {channels.map((channel) => (
            <li
              key={channel.name}
              className="rounded-2xl border border-white/10 bg-[#0B0C0E] p-5"
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-bold text-white">{channel.name}</h3>
                <span className="text-xs font-semibold uppercase tracking-wider text-orange-400">
                  {channel.cost}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-400">{channel.note}</p>
              {channel.href ? (
                <a
                  href={channel.href}
                  target={channel.href.startsWith("http") ? "_blank" : undefined}
                  rel={channel.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="mt-3 inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold text-orange-400 underline-offset-4 hover:underline"
                >
                  Open
                  {channel.href.startsWith("http") ? (
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  ) : null}
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <RelatedLinks
        title="The listings these posts point at"
        intro="Google Jobs reads /jobs. Drivers apply at /apply."
        links={driverLinks(["/refer"])}
      />
    </div>
  )
}
