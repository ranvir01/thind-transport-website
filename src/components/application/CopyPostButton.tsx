"use client"

import { useEffect, useState } from "react"
import { Check, Copy, Share2 } from "lucide-react"
import { copyTextToClipboard } from "@/lib/copy-text"

export function CopyPostButton({
  text,
  label = "Copy",
}: {
  text: string
  label?: string
}) {
  const [done, setDone] = useState(false)
  const [failed, setFailed] = useState(false)
  const [canShare, setCanShare] = useState(false)

  useEffect(() => {
    setCanShare(typeof navigator.share === "function")
  }, [])

  async function copy() {
    const ok = await copyTextToClipboard(text)
    setDone(ok)
    setFailed(!ok)
    if (ok) window.setTimeout(() => setDone(false), 2000)
  }

  async function share() {
    try {
      await navigator.share({ text })
    } catch {
      // User cancelled — not an error.
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={copy}
        aria-live="polite"
        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white hover:bg-orange-500"
      >
        {done ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
        {done ? "Copied" : failed ? "Select the text below" : label}
      </button>
      {canShare ? (
        <button
          type="button"
          onClick={share}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15"
        >
          <Share2 className="h-4 w-4" aria-hidden />
          Share
        </button>
      ) : null}
    </div>
  )
}
