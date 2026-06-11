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

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/hub/notifications")
      if (!res.ok) return
      const data = await res.json()
      setItems(data.items ?? [])
      setUnread(data.unread ?? 0)
    } catch {
      /* offline — keep what we have */
    }
  }, [])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 60_000)
    return () => clearInterval(interval)
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
    if (next && unread > 0) {
      // Opening the feed clears the badge — simple and predictable.
      fetch("/api/hub/notifications", { method: "POST" }).catch(() => {})
      setUnread(0)
    }
    if (next) refresh()
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        aria-label={unread > 0 ? `Notifications (${unread} unread)` : "Notifications"}
        onClick={toggle}
        className="relative flex h-11 w-11 items-center justify-center rounded-xl text-steel-100 hover:bg-white/5"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 ? (
          <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className={cn(
            "absolute right-0 z-50 w-[min(92vw,360px)] overflow-hidden rounded-2xl border border-white/10 bg-navy-900 shadow-2xl",
            direction === "down" ? "top-12" : "bottom-12"
          )}
        >
          <p className="border-b border-white/10 px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gold">
            Notifications
          </p>
          <div className="max-h-[60vh] overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-body-sm text-steel-300">
                Nothing yet — alerts about dispatches, messages, and paperwork will show up here.
              </p>
            ) : (
              items.map((item) => (
                <Link
                  key={item.id}
                  href={item.link ?? "/hub"}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "block border-b border-white/5 px-4 py-3 hover:bg-white/5",
                    !item.read_at && "bg-orange/[0.06]"
                  )}
                >
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  {item.body ? <p className="mt-0.5 text-body-xs text-steel-200">{item.body}</p> : null}
                  <p className="mt-1 text-[11px] text-steel-400">{timeAgo(item.created_at)}</p>
                </Link>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
