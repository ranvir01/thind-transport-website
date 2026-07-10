"use client"

import Link from "next/link"
import { ArrowRight, CircleHelp, Keyboard, PlayCircle } from "lucide-react"
import { HELP_TOPICS, HUB_TOURS } from "@/lib/hub/help"
import { HAULDESK_MISSION } from "@/lib/hub/setup-guide"
import { Panel } from "@/components/hub/ui"
import { cn } from "@/lib/utils"

export function HelpCenter() {
  return (
    <div className="max-w-3xl space-y-8">
      <header>
        <p className="text-sm font-medium text-accent-text flex items-center gap-2">
          <CircleHelp className="h-4 w-4" />
          Help
        </p>
        <h1 className="mt-1 text-[22px] font-semibold tracking-tight text-fg">How to use LoadOff</h1>
        <p className="mt-2 text-sm text-fg-2 leading-relaxed">{HAULDESK_MISSION}</p>
      </header>

      <section>
        <h2 className="text-[13.5px] font-semibold text-fg mb-3">Interactive tours</h2>
        <p className="text-sm text-fg-3 mb-3">
          Step through the real app with spotlights — always matches what you see on screen.
        </p>
        <div className="space-y-3">
          {HUB_TOURS.map((tour) => (
            <Panel key={tour.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-fg">{tour.title}</h3>
                  <p className="mt-1 text-sm text-fg-2">{tour.summary}</p>
                  <p className="mt-1 text-xs text-fg-3">{tour.steps.length} steps · starts on Today</p>
                </div>
                <Link
                  href={`${tour.startPath}?tour=${tour.id}`}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-control bg-accent px-3 py-2",
                    "text-sm font-semibold text-accent-fg hover:bg-accent-hover min-h-[44px]"
                  )}
                >
                  <PlayCircle className="h-4 w-4" />
                  Start tour
                </Link>
              </div>
            </Panel>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-[13.5px] font-semibold text-fg mb-3">Video walkthroughs</h2>
        <p className="text-sm text-fg-3 mb-3">
          30-second captioned recordings of the real product — watch with the sound off.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { src: "/videos/tour-office.mp4", poster: "/videos/poster-office.jpg", title: "Run the morning", blurb: "Today → dispatch → loads → money → integrations" },
            { src: "/videos/tour-money.mp4", poster: "/videos/poster-money.jpg", title: "From delivered to paid", blurb: "Invoices, receivables, driver settlements" },
            { src: "/videos/tour-driver.mp4", poster: "/videos/poster-driver.jpg", title: "The driver app", blurb: "Confirm, status taps, pay stubs, install on a phone" },
          ].map((video) => (
            <Panel key={video.src} className="overflow-hidden">
              <video
                poster={video.poster}
                controls
                muted
                playsInline
                preload="none"
                className="w-full h-auto"
                aria-label={`${video.title} — ${video.blurb}`}
              >
                <source src={video.src} type="video/mp4" />
                <source src={video.src.replace(/\.mp4$/, ".webm")} type="video/webm" />
              </video>
              <div className="p-3">
                <h3 className="font-semibold text-fg text-sm">{video.title}</h3>
                <p className="mt-0.5 text-xs text-fg-3">{video.blurb}</p>
              </div>
            </Panel>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-[13.5px] font-semibold text-fg mb-3">Common questions</h2>
        <div className="space-y-2">
          {HELP_TOPICS.map((topic) => (
            <Panel key={topic.id} className="p-4">
              <h3 className="font-semibold text-fg text-sm">{topic.question}</h3>
              <p className="mt-1.5 text-sm text-fg-2 leading-relaxed">{topic.answer}</p>
              {topic.href ? (
                <Link
                  href={topic.href}
                  className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-accent-text hover:underline"
                >
                  {topic.hrefLabel ?? "Open"} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ) : null}
            </Panel>
          ))}
        </div>
      </section>

      <Panel className="p-4 bg-surface-2 border-dashed">
        <h2 className="text-[13.5px] font-semibold text-fg flex items-center gap-2">
          <Keyboard className="h-4 w-4 text-fg-3" />
          Shortcuts
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-fg-2">
          <li>
            <kbd className="rounded border border-border-strong bg-surface px-1.5 py-0.5 font-mono text-xs">
              ⌘K
            </kbd>{" "}
            /{" "}
            <kbd className="rounded border border-border-strong bg-surface px-1.5 py-0.5 font-mono text-xs">
              Ctrl+K
            </kbd>{" "}
            — search any screen
          </li>
          <li>
            <kbd className="rounded border border-border-strong bg-surface px-1.5 py-0.5 font-mono text-xs">
              Esc
            </kbd>{" "}
            — close tour or command palette
          </li>
        </ul>
        <p className="mt-3 text-sm text-fg-3">
          First week?{" "}
          <Link href="/hub/guide" className="text-accent-text font-medium hover:underline">
            Read the full setup guide
          </Link>
          .
        </p>
      </Panel>
    </div>
  )
}
