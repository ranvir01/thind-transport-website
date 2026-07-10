"use client"

/**
 * The notification bell: unread badge + a simple plain-language feed.
 * Tapping an item deep-links to the record that needs attention.
 */
import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Bell } from "lucide-react"
import { cn } from "@/lib/utils"

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

export function NotificationsBell({ direction = "down" }: { direction?: "down" | "up" }) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<FeedItem[]>([])
  const [unread, setUnread] = useState(0)
  const panelRef = useRef<HTMLDivElement>(null)
  // Monotonic fetch sequence: a response only applies if nothing superseded it
  // (a newer fetch, or clearing the badge) while it was in flight.
  const fetchSeq = useRef(0)

  const refresh = useCallback(async () => {
    const seq = ++fetchSeq.current
    try {
      const res = await fetch("/api/hub/notifications")
      if (!res.ok) return
      const data = await res.json()
      if (seq !== fetchSeq.current) return
      setItems(data.items ?? [])
      setUnread(data.unread ?? 0)
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
    document.addEventListener("mousedown", close)
    return () => document.removeEventListener("mousedown", close)
  }, [open])

  const toggle = async () => {
    const next = !open
    setOpen(next)
    if (!next) return
    if (unread > 0) {
      // Opening the feed clears the badge — simple and predictable. Invalidate
      // any in-flight poll (its stale unread count would resurrect the badge),
      // and only re-fetch after the server has committed the mark-as-read.
      fetchSeq.current++
      setUnread(0)
      try {
        await fetch("/api/hub/notifications", { method: "POST" })
      } catch {
        /* offline — the next poll restores server truth */
      }
    }
    refresh()
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        aria-label={unread > 0 ? `Notifications (${unread} unread)` : "Notifications"}
        onClick={toggle}
        className="relative flex h-9 w-9 items-center justify-center rounded-control border border-border-strong text-fg-2 hover:bg-hover"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-pill bg-accent px-1 text-[10px] font-bold text-accent-fg">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className={cn(
            "absolute right-0 z-50 w-[min(92vw,360px)] overflow-hidden rounded-card border border-border bg-surface shadow-card",
            direction === "down" ? "top-11" : "bottom-11"
          )}
        >
          <p className="border-b border-border px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-fg-3">
            Notifications
          </p>
          <div className="max-h-[60vh] overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-body-sm text-fg-3">
                Nothing yet — alerts about dispatches, messages, and paperwork will show up here.
              </p>
            ) : (
              items.map((item) => (
                <Link
                  key={item.id}
                  href={item.link ?? "/hub"}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "block border-b border-border px-4 py-3 hover:bg-hover",
                    !item.read_at && "bg-accent-soft"
                  )}
                >
                  <p className="text-sm font-semibold text-fg">{item.title}</p>
                  {item.body ? <p className="mt-0.5 text-body-xs text-fg-2">{item.body}</p> : null}
                  <p className="mt-1 text-[11px] text-fg-3">{timeAgo(item.created_at)}</p>
                </Link>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
