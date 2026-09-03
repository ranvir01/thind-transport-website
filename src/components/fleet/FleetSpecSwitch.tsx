"use client"

import { useRef, useState, type ReactNode } from "react"

/**
 * The one client island on /fleet: which spec panel is showing.
 *
 * That is the only real state the page has, so it is the only thing that ships
 * JavaScript. The panels themselves are server-rendered and passed in as
 * elements, so the tractor and trailer specs stay HTML — and both panels stay
 * in the DOM (the inactive one is `hidden`), so a crawler and a reader with
 * JavaScript off still get every spec on the page.
 *
 * ARIA tablist with roving tabindex and arrow-key movement, per the APG
 * pattern. No filled red anywhere in here: the page's one red action is the
 * apply CTA, and a red tab would compete with it.
 */

export interface SpecTab {
  id: string
  label: string
  /** Rendered beside the label so the tab says how much is behind it. */
  count: number
  /** What the count counts — "builds", "types". Required, because a bare
   *  number on a tab reading "Trailers 3" is read as three trailers owned,
   *  which contradicts the one fleet count the page publishes. */
  countUnit: string
  panel: ReactNode
}

export function FleetSpecSwitch({ tabs }: { tabs: SpecTab[] }) {
  const [active, setActive] = useState(tabs[0].id)
  const listRef = useRef<HTMLDivElement>(null)

  function move(from: number, delta: number) {
    const next = (from + delta + tabs.length) % tabs.length
    setActive(tabs[next].id)
    listRef.current?.querySelectorAll<HTMLButtonElement>("[role=tab]")[next]?.focus()
  }

  return (
    <div>
      <div
        ref={listRef}
        role="tablist"
        aria-label="Equipment type"
        className="flex flex-wrap gap-2 border-b border-ink/15 pb-4"
      >
        {tabs.map((tab, i) => {
          const selected = tab.id === active
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`${tab.id}-tab`}
              aria-selected={selected}
              aria-controls={`${tab.id}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(tab.id)}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight") {
                  e.preventDefault()
                  move(i, 1)
                } else if (e.key === "ArrowLeft") {
                  e.preventDefault()
                  move(i, -1)
                }
              }}
              className={[
                "inline-flex min-h-[48px] items-center gap-2 rounded-fleet px-5 text-m-body font-semibold",
                "transition-colors duration-base ease-entrance",
                selected
                  ? "bg-ink text-paper"
                  : "border border-ink/20 text-ink-2 hover:border-ink/40 hover:text-ink",
              ].join(" ")}
            >
              <span>{tab.label}</span>
              <span
                className={[
                  "inline-flex items-baseline gap-1 text-m-body font-normal",
                  selected ? "text-paper/70" : "text-ink-3",
                ].join(" ")}
              >
                <span className="font-mono tabular-nums">{tab.count}</span>
                <span>{tab.countUnit}</span>
              </span>
            </button>
          )
        })}
      </div>

      {tabs.map((tab) => (
        <div
          key={tab.id}
          id={`${tab.id}-panel`}
          role="tabpanel"
          aria-labelledby={`${tab.id}-tab`}
          hidden={tab.id !== active}
          className="pt-6"
        >
          {tab.panel}
        </div>
      ))}
    </div>
  )
}
