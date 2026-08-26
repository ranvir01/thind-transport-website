"use client"

/**
 * The notification bell: unread badge + a simple plain-language feed.
 * Tapping an item deep-links to the record that needs attention.
 */
import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Bell } from "lucide-react"
import { cn } from "@/lib/utils"
import { applyAppBadge } from "@/lib/hub/pwa"

interface FeedItem {
  id: number
  kind: string
  title: string
  body: string | null
  link: string | null
  read_at: string | null
  created_at: string
}

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function NotificationsBell({
  direction = "down",
  variant = "light",
}: {
  direction?: "down" | "up"
  variant?: "light" | "dark"
}) {
  const dark = variant === "dark"
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<FeedItem[]>([])
  const [unread, setUnread] = useState(0)
  const panelRef = useRef<HTMLDivElement>(null)
  // Bumped on every mark-all-read so in-flight GETs from before the clear
  // can't land afterwards and resurrect the stale unread badge.
  const epoch = useRef(0)

  const refresh = useCallback(async () => {
    const started = epoch.current
    try {
      const res = await fetch("/api/hub/notifications")
      if (!res.ok) return
      const data = await res.json()
      if (started !== epoch.current) return
      setItems(data.items ?? [])
      setUnread(data.unread ?? 0)
      // Mirror the count onto the installed app's icon (no-op in plain tabs).
      applyAppBadge(data.unread ?? 0)
    } catch {
      /* offline — keep what we have */
    }
  }, [])

  useEffect(() => {
    // Defer the first fetch out of the effect body (no sync setState cascades).
    const initial = setTimeout(refresh, 0)
    const interval = setInterval(refresh, 60_000)
    return () => {
      clearTimeout(initial)
      clearInterval(interval)
    }
  }, [refresh])

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", close)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", close)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  const toggle = async () => {
    const next = !open
    setOpen(next)
    if (!next) return
    if (unread > 0) {
      // Opening the feed clears the badge. Await the write before refreshing
      // so the follow-up GET can't read a pre-clear snapshot; if the write
      // fails (offline), the refresh below restores the real server count.
      epoch.current++
      setUnread(0)
      applyAppBadge(0)
      try {
        await fetch("/api/hub/notifications", { method: "POST" })
      } catch {
        /* offline — refresh() will restore the true unread count */
      }
    }
    refresh()
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        aria-label={unread > 0 ? `Notifications (${unread} unread)` : "Notifications"}
        onClick={toggle}
        className={cn(
          "relative flex items-center justify-center rounded-control",
          // Office header uses borderless ghost icons; the driver chrome keeps
          // its bordered dark variant.
          dark
            ? "h-9 w-9 border border-white/15 text-steel-200 hover:bg-white/5"
            : "h-10 w-10 text-fg-2 hover:bg-hover"
        )}
      >
        <Bell className={dark ? "h-4 w-4" : "h-[18px] w-[18px]"} />
        {unread > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-pill bg-accent px-1 text-[10px] font-bold text-accent-fg">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className={cn(
            // Phones: pin to the viewport (the bell isn't the rightmost header
            // item, so a button-anchored 360px panel would run off the left
            // edge). sm+: anchor to the button like a normal popover.
            "z-50 overflow-hidden rounded-card border shadow-raised",
            "fixed inset-x-3 sm:absolute sm:inset-x-auto sm:right-0 sm:w-[min(92vw,360px)]",
            dark ? "border-white/10 bg-navy-600" : "border-border bg-surface",
            direction === "down"
              ? "top-[calc(3.5rem+env(safe-area-inset-top,0px)+0.375rem)] sm:top-11"
              : "bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] sm:bottom-11"
          )}
        >
          <p
            className={cn(
              "border-b px-4 py-3 text-[11px] font-semibold uppercase tracking-wide",
              dark ? "border-white/10 text-steel-400" : "border-border text-fg-3"
            )}
          >
            Notifications
          </p>
          <div className="max-h-[60vh] overflow-y-auto">
            {items.length === 0 ? (
              <p className={cn("px-4 py-8 text-center text-body-sm", dark ? "text-steel-400" : "text-fg-3")}>
                Nothing yet — alerts about dispatches, messages, and paperwork will show up here.
              </p>
            ) : (
              items.map((item) => (
                <Link
                  key={item.id}
                  href={item.link ?? "/hub"}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "block border-b px-4 py-3",
                    dark ? "border-white/10 hover:bg-white/5" : "border-border hover:bg-hover",
                    !item.read_at && (dark ? "bg-white/[0.04]" : "bg-accent-soft")
                  )}
                >
                  <p className={cn("text-sm font-semibold break-words", dark ? "text-white" : "text-fg")}>{item.title}</p>
                  {item.body ? (
                    <p className={cn("mt-0.5 text-body-xs break-words", dark ? "text-steel-200" : "text-fg-2")}>{item.body}</p>
                  ) : null}
                  <p className={cn("mt-1 text-[11px]", dark ? "text-steel-400" : "text-fg-3")}>
                    {timeAgo(item.created_at)}
                  </p>
                </Link>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
