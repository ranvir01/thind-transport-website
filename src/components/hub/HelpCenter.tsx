"use client"

/**
 * Help & learning centre — one searchable place for every way of learning the
 * product: interactive tours (spotlight the real UI, so they never go stale),
 * captioned video walkthroughs, written playbooks for multi-screen jobs,
 * browse-by-topic, shortcuts, and how to reach a human.
 *
 * The search filters every section at once, so "settlement" surfaces the tour,
 * the video, the playbook, and the FAQ together rather than making someone
 * guess which section holds the answer.
 */

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowRight, BookOpen, ChevronRight, CircleHelp, Fuel, Keyboard, Mail, MapPin,
  PlayCircle, Phone, Receipt, Search, ShieldCheck, SlidersHorizontal, Truck, Users, Wallet, X,
} from "lucide-react"
import { HELP_TOPICS, HUB_TOURS, PLAYBOOKS } from "@/lib/hub/help"
import { PersonaTheater } from "@/components/hub/showcase/PersonaTheater"
import { HAULDESK_MISSION } from "@/lib/hub/setup-guide"
import { COMPANY_INFO } from "@/lib/constants"
import { Panel } from "@/components/hub/ui"
import { cn } from "@/lib/utils"

const VIDEOS = [
  { src: "/videos/tour-office.mp4", poster: "/videos/poster-office.jpg", title: "Run the morning", blurb: "Today → dispatch → loads → money → integrations" },
  { src: "/videos/tour-money.mp4", poster: "/videos/poster-money.jpg", title: "From delivered to paid", blurb: "Invoices, receivables, driver settlements" },
  { src: "/videos/tour-driver.mp4", poster: "/videos/poster-driver.jpg", title: "The driver app", blurb: "Confirm, status taps, pay stubs, install on a phone" },
]

const TOPICS = [
  { href: "/hub/loads", label: "Loads", blurb: "Booking, rate-con intake, and the load lifecycle.", icon: BookOpen },
  { href: "/hub/dispatch", label: "Dispatch & tracking", blurb: "Board, planner, HOS, live map, ETAs.", icon: MapPin },
  { href: "/hub/money", label: "Money & billing", blurb: "Invoices, AR aging, and payments.", icon: Wallet },
  { href: "/hub/money/settlements", label: "Settlements & payroll", blurb: "Pay rules, advances, escrow.", icon: Receipt },
  { href: "/hub/fleet", label: "Fleet", blurb: "Trucks, trailers, maintenance, inspections.", icon: Truck },
  { href: "/hub/drivers", label: "Drivers & people", blurb: "Drivers, recruiting, customers, facilities.", icon: Users },
  { href: "/hub/compliance", label: "Compliance & safety", blurb: "DOT documents, accident register, expiries.", icon: ShieldCheck },
  { href: "/hub/fuel", label: "Fuel & IFTA", blurb: "Fuel cards, fraud flags, quarterly filing.", icon: Fuel },
  { href: "/hub/settings/users", label: "Settings", blurb: "Company, users, pay rules, appearance.", icon: SlidersHorizontal },
]

const SHORTCUTS = [
  { keys: "⌘K", label: "Command palette — jump to any screen" },
  { keys: "Ctrl+K", label: "The same palette on Windows" },
  { keys: "Esc", label: "Close the palette, a dialog, or a tour" },
]

const kbdCls = "rounded border border-border-strong bg-surface px-1.5 py-0.5 font-mono text-xs text-fg-2"

/** True when the query is empty or appears anywhere in the supplied text. */
function matches(q: string, ...parts: (string | undefined)[]) {
  return !q || parts.filter(Boolean).join(" ").toLowerCase().includes(q)
}

export function HelpCenter() {
  const [query, setQuery] = useState("")
  const [openPlaybook, setOpenPlaybook] = useState<string | null>(PLAYBOOKS[0]?.id ?? null)
  const q = query.trim().toLowerCase()
  const searching = q.length > 0

  const tours = useMemo(() => HUB_TOURS.filter((t) => matches(q, t.title, t.summary)), [q])
  const videos = useMemo(() => VIDEOS.filter((v) => matches(q, v.title, v.blurb)), [q])
  const playbooks = useMemo(
    () => PLAYBOOKS.filter((p) => matches(q, p.title, p.summary, ...p.steps.flatMap((s) => [s.text, s.note]))),
    [q]
  )
  const topics = useMemo(() => TOPICS.filter((t) => matches(q, t.label, t.blurb)), [q])
  const faqs = useMemo(() => HELP_TOPICS.filter((t) => matches(q, t.question, t.answer)), [q])

  const nothing =
    searching && !tours.length && !videos.length && !playbooks.length && !topics.length && !faqs.length

  return (
    <div className="max-w-3xl space-y-8">
      <header>
        <p className="flex items-center gap-2 text-sm font-medium text-accent-text">
          <CircleHelp className="h-4 w-4" />
          Help
        </p>
        <h1 className="mt-1 text-[22px] font-semibold tracking-tight text-fg">How to use LoadOff</h1>
        <p className="mt-2 text-sm leading-relaxed text-fg-2">{HAULDESK_MISSION}</p>
      </header>

      {/* Search filters every section at once */}
      <div className="flex items-center gap-2 rounded-control border border-border-strong bg-surface px-3 py-2.5">
        <Search className="h-4 w-4 shrink-0 text-fg-3" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tours, videos, playbooks, shortcuts…"
          aria-label="Search help"
          className="w-full bg-transparent text-sm text-fg placeholder:text-fg-3 focus:outline-none"
        />
        {searching ? (
          <button
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="shrink-0 rounded p-1 text-fg-3 hover:bg-hover hover:text-fg"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {nothing ? (
        <Panel className="p-6 text-center">
          <p className="text-sm text-fg-2">Nothing matches &ldquo;{query}&rdquo;.</p>
          <p className="mt-1 text-sm text-fg-3">
            Try a word like invoice, settlement, IFTA, dispatch, or driver.
          </p>
        </Panel>
      ) : null}

      {!searching && (
        <section>
          <h2 className="mb-3 text-[13.5px] font-semibold text-fg">Live product theater</h2>
          <p className="mb-3 text-sm text-fg-3">
            Walk every seat on mock data — or{" "}
            <Link href="/hub/demo" className="font-medium text-accent-text hover:underline">
              play the 90-second interactive demo
            </Link>
            .
          </p>
          <PersonaTheater compact />
        </section>
      )}

      {tours.length > 0 && (
        <section>
          <h2 className="mb-3 text-[13.5px] font-semibold text-fg">Interactive tours</h2>
          <p className="mb-3 text-sm text-fg-3">
            Step through the real app with spotlights — always matches what you see on screen.
          </p>
          <div className="space-y-3">
            {tours.map((tour) => (
              <Panel key={tour.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-fg">{tour.title}</h3>
                    <p className="mt-1 text-sm text-fg-2">{tour.summary}</p>
                    <p className="mt-1 text-xs text-fg-3">
                      {tour.steps.length} steps · starts on {tour.startPath}
                    </p>
                  </div>
                  <Link
                    href={`${tour.startPath}?tour=${tour.id}`}
                    className={cn(
                      "inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-control bg-accent px-3 py-2",
                      "text-sm font-semibold text-accent-fg hover:bg-accent-hover"
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
      )}

      {videos.length > 0 && (
        <section>
          <h2 className="mb-3 text-[13.5px] font-semibold text-fg">Video walkthroughs</h2>
          <p className="mb-3 text-sm text-fg-3">
            30-second captioned recordings of the real product — watch with the sound off.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {videos.map((video) => (
              <Panel key={video.src} className="overflow-hidden">
                <video
                  poster={video.poster}
                  controls
                  muted
                  playsInline
                  preload="none"
                  className="h-auto w-full"
                  aria-label={`${video.title} — ${video.blurb}`}
                >
                  <source src={video.src} type="video/mp4" />
                  <source src={video.src.replace(/\.mp4$/, ".webm")} type="video/webm" />
                </video>
                <div className="p-3">
                  <h3 className="text-sm font-semibold text-fg">{video.title}</h3>
                  <p className="mt-0.5 text-xs text-fg-3">{video.blurb}</p>
                </div>
              </Panel>
            ))}
          </div>
        </section>
      )}

      {playbooks.length > 0 && (
        <section>
          <h2 className="mb-3 text-[13.5px] font-semibold text-fg">Step-by-step playbooks</h2>
          <p className="mb-3 text-sm text-fg-3">
            The jobs that span several screens, written out once — hand these to a new dispatcher.
          </p>
          <div className="space-y-2">
            {playbooks.map((p) => {
              const isOpen = searching || openPlaybook === p.id
              return (
                <Panel key={p.id} className="overflow-hidden">
                  <button
                    onClick={() => setOpenPlaybook(isOpen && !searching ? null : p.id)}
                    aria-expanded={isOpen}
                    className="flex min-h-[44px] w-full items-center justify-between gap-3 p-4 text-left hover:bg-hover"
                  >
                    <span className="min-w-0">
                      <span className="block font-semibold text-fg">{p.title}</span>
                      <span className="mt-0.5 block text-sm text-fg-2">{p.summary}</span>
                    </span>
                    <ChevronRight
                      className={cn("h-4 w-4 shrink-0 text-fg-3 transition-transform", isOpen && "rotate-90")}
                    />
                  </button>
                  {isOpen && (
                    <ol className="space-y-3 border-t border-border p-4 pt-3">
                      {p.steps.map((step, i) => (
                        <li key={step.text} className="flex gap-3">
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-bold text-accent-text">
                            {i + 1}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm text-fg-2">{step.text}</span>
                            {step.note ? <span className="mt-1 block text-xs text-fg-3">{step.note}</span> : null}
                          </span>
                        </li>
                      ))}
                    </ol>
                  )}
                </Panel>
              )
            })}
          </div>
        </section>
      )}

      {topics.length > 0 && (
        <section>
          <h2 className="mb-3 text-[13.5px] font-semibold text-fg">Browse by topic</h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {topics.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className="flex min-h-[44px] items-start gap-3 rounded-control border border-border bg-surface p-3 hover:bg-hover"
              >
                <t.icon className="mt-0.5 h-4 w-4 shrink-0 text-fg-3" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-fg">{t.label}</span>
                  <span className="mt-0.5 block text-xs text-fg-3">{t.blurb}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {faqs.length > 0 && (
        <section>
          <h2 className="mb-3 text-[13.5px] font-semibold text-fg">Common questions</h2>
          <div className="space-y-2">
            {faqs.map((topic) => (
              <Panel key={topic.id} className="p-4">
                <h3 className="text-sm font-semibold text-fg">{topic.question}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-fg-2">{topic.answer}</p>
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
      )}

      {!searching && (
        <>
          <Panel className="border-dashed bg-surface-2 p-4">
            <h2 className="flex items-center gap-2 text-[13.5px] font-semibold text-fg">
              <Keyboard className="h-4 w-4 text-fg-3" />
              Shortcuts
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-fg-2">
              {SHORTCUTS.map((s) => (
                <li key={s.keys}>
                  <kbd className={kbdCls}>{s.keys}</kbd> — {s.label}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-fg-3">
              First week?{" "}
              <Link href="/hub/guide" className="font-medium text-accent-text hover:underline">
                Read the full setup guide
              </Link>
              .
            </p>
          </Panel>

          {/* Honest support: this is our own system — the people who built it answer. */}
          <Panel className="p-4">
            <h2 className="text-[13.5px] font-semibold text-fg">Still stuck?</h2>
            <p className="mt-1 text-sm text-fg-3">
              LoadOff is built and run in-house — you&apos;re not filing a ticket with a vendor.
            </p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <a
                href={`tel:${COMPANY_INFO.phoneFormatted}`}
                className="flex min-h-[44px] items-center gap-3 rounded-control border border-border bg-surface p-3 hover:bg-hover"
              >
                <Phone className="h-4 w-4 shrink-0 text-fg-3" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-fg">Call the office</span>
                  <span className="block text-xs text-fg-3">{COMPANY_INFO.phone}</span>
                </span>
              </a>
              <a
                href={`mailto:${COMPANY_INFO.email}`}
                className="flex min-h-[44px] items-center gap-3 rounded-control border border-border bg-surface p-3 hover:bg-hover"
              >
                <Mail className="h-4 w-4 shrink-0 text-fg-3" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-fg">Email</span>
                  <span className="block truncate text-xs text-fg-3">{COMPANY_INFO.email}</span>
                </span>
              </a>
            </div>
          </Panel>
        </>
      )}
    </div>
  )
}
