"use client"

/**
 * Chat view shared by the office and the driver app (E3).
 * Plain SMS-style bubbles, photo attachments, template chips for the office.
 */
import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Camera, Loader2, Send } from "lucide-react"
import { cn } from "@/lib/utils"
import { markThreadReadAction, sendMessageAction } from "@/app/hub/_actions/messages"
import type { HubMessage } from "@/lib/hub/types"
import { fieldDarkCls } from "@/components/hub/ui"

export function ChatThread({
  threadId,
  messages,
  meId,
  templates = [],
  readUpTo = {},
  variant = "office",
}: {
  threadId: string
  messages: HubMessage[]
  meId: string
  templates?: { id: string; label: string; body: string }[]
  /** other participants' read positions: name → last_read_message_id */
  readUpTo?: Record<string, number>
  /** Office uses semantic tokens; driver/portal forced-dark chrome uses fixed palette. */
  variant?: "office" | "dark"
}) {
  const dark = variant === "dark"
  const router = useRouter()
  const [body, setBody] = useState("")
  const [pending, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" })
    markThreadReadAction(threadId).catch(() => {})
  }, [threadId, messages.length])

  // Light polling keeps the conversation honest without sockets.
  useEffect(() => {
    const interval = setInterval(() => router.refresh(), 15_000)
    return () => clearInterval(interval)
  }, [router])

  const send = (file?: File) => {
    if (pending) return
    if (!body.trim() && !file) return
    const formData = new FormData()
    formData.set("thread_id", threadId)
    formData.set("body", body)
    if (file) formData.set("file", file)
    startTransition(async () => {
      const result = await sendMessageAction(formData)
      if (result.ok) {
        setBody("")
        router.refresh()
      } else toast.error(result.error ?? "Could not send")
      if (fileRef.current) fileRef.current.value = ""
    })
  }

  const lastMineId = [...messages].reverse().find((m) => m.sender_id === meId)?.id
  const seenBy = lastMineId
    ? Object.entries(readUpTo)
        .filter(([, upTo]) => upTo >= lastMineId)
        .map(([name]) => name)
    : []

  return (
    <div className="flex flex-col h-[calc(100dvh-220px)] min-h-[320px]">
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {messages.length === 0 ? (
          <p className={cn("py-10 text-center text-body-sm", dark ? "text-steel-300" : "text-fg-3")}>
            No messages yet — say hello.
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === meId
            return (
              <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[80%] rounded-card px-3.5 py-2.5",
                    mine
                      ? dark
                        // The office accent (bg-accent) is indigo and mode-dependent;
                        // on the forced-dark surface own bubbles wear the carrier's accent.
                        ? "bg-[color:var(--driver-accent-fill,var(--driver-accent))] text-[color:var(--driver-accent-fg,#121316)]"
                        : "bg-accent text-accent-fg"
                      : dark
                        ? "bg-white/[0.07] text-steel-200"
                        : "bg-surface-2 text-fg-2"
                  )}
                >
                  {!mine ? (
                    <p className="text-[12px] font-bold uppercase tracking-wider opacity-70 mb-0.5">{m.sender_name}</p>
                  ) : null}
                  {m.document_url ? (
                    m.document_mime?.startsWith("image/") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.document_url} alt="Attachment" className="mb-1.5 max-h-60 rounded-control" />
                    ) : (
                      <a href={m.document_url} target="_blank" rel="noreferrer" className="block underline mb-1">
                        Attachment
                      </a>
                    )
                  ) : null}
                  {m.body ? <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p> : null}
                  <p className={cn("mt-1 text-[12px]", mine ? "opacity-60" : dark ? "text-steel-300" : "text-fg-3")}>
                    {new Date(m.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            )
          })
        )}
        {seenBy.length > 0 ? (
          <p className={cn("text-right text-[12px]", dark ? "text-steel-300" : "text-fg-3")}>
            Seen by {seenBy.join(", ")}
          </p>
        ) : null}
        <div ref={bottomRef} />
      </div>

      {templates.length > 0 ? (
        <div className="flex gap-1.5 overflow-x-auto py-2 -mx-1 px-1">
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => setBody(t.body)}
              className={cn(
                "shrink-0 rounded-full border px-3 font-semibold",
                dark
                  ? "min-h-[44px] border-white/15 bg-white/5 text-[13px] text-steel-200 hover:bg-white/10"
                  : "min-h-[32px] border-border-strong bg-surface-2 py-1.5 text-body-xs text-fg-2 hover:bg-hover"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      ) : null}

      <div
        className={cn("flex items-end gap-2 pt-2 border-t", dark ? "border-white/10" : "border-border")}
      >
        <button
          onClick={() => fileRef.current?.click()}
          aria-label="Attach a photo"
          disabled={pending}
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-control border disabled:opacity-60",
            dark
              ? "border-white/15 text-steel-200 hover:bg-white/10"
              : "border-border-strong text-fg-2 hover:bg-hover"
          )}
        >
          <Camera className="h-5 w-5" />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,application/pdf"
          capture="environment"
          className="hidden"
          onChange={(e) => send(e.target.files?.[0] ?? undefined)}
        />
        <textarea
          rows={1}
          placeholder="Type a message…"
          className={cn(
            "flex-1 resize-none min-h-[48px]",
            dark
              // fieldDarkCls brings text-base at touch widths (no iOS focus-zoom).
              ? cn(fieldDarkCls, "h-auto min-h-[48px] py-3")
              : "rounded-control border border-border-strong bg-surface px-3 py-3 text-sm text-fg placeholder:text-fg-3"
          )}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
        />
        <button
          onClick={() => send()}
          aria-label="Send"
          disabled={pending || !body.trim()}
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-control",
            dark
              ? "bg-[color:var(--driver-accent-fill,var(--driver-accent))] text-[color:var(--driver-accent-fg,#121316)] hover:brightness-110 disabled:pointer-events-none disabled:bg-white/10 disabled:text-white/40"
              : "bg-accent text-accent-fg hover:bg-accent-hover disabled:opacity-50"
          )}
        >
          {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </button>
      </div>
    </div>
  )
}
