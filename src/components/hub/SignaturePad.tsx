"use client"

/**
 * Canvas e-signature: sign with a finger, no DocuSign subscription.
 * Used for announcement acknowledgements (E3) and offer letters (E5).
 */
import { useEffect, useRef, useState } from "react"
import { Eraser } from "lucide-react"
import { cn } from "@/lib/utils"

export function SignaturePad({
  onChange,
  height = 140,
  variant = "office",
}: {
  onChange: (dataUrl: string | null) => void
  height?: number
  /** Office uses semantic tokens for the chrome; driver/portal forced-dark uses fixed palette. */
  variant?: "office" | "dark"
}) {
  const dark = variant === "dark"
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const [hasInk, setHasInk] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const scale = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * scale
    canvas.height = height * scale
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.scale(scale, scale)
    // Dark ink on the white "paper" pad regardless of surface: the PNG is
    // embedded on white PDF pages (broker agreement) and stored for later
    // light-surface renders — near-white ink there is an invisible signature.
    ctx.strokeStyle = "#16181D"
    ctx.lineWidth = 2.5
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
  }, [height])

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    drawing.current = true
    const ctx = canvasRef.current?.getContext("2d")
    if (!ctx) return
    const p = point(e)
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
  }

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return
    e.preventDefault()
    const ctx = canvasRef.current?.getContext("2d")
    if (!ctx) return
    const p = point(e)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    if (!hasInk) setHasInk(true)
  }

  const end = () => {
    if (!drawing.current) return
    drawing.current = false
    const canvas = canvasRef.current
    if (canvas && hasInk) onChange(canvas.toDataURL("image/png"))
    else if (canvas) {
      // First stroke may end before state flushes — still emit.
      onChange(canvas.toDataURL("image/png"))
      setHasInk(true)
    }
  }

  const clear = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      setHasInk(false)
      onChange(null)
    }
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        style={{ height, touchAction: "none" }}
        className={cn(
          "w-full rounded-xl border border-dashed bg-white",
          dark ? "border-white/25" : "border-border-strong"
        )}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
      />
      <div className="mt-1.5 flex items-center justify-between">
        <p className={cn("text-body-xs", dark ? "text-steel-400" : "text-fg-3")}>
          Sign above with your finger
        </p>
        <button
          type="button"
          onClick={clear}
          className={cn(
            "flex items-center gap-1 text-body-xs font-semibold min-h-[32px]",
            dark ? "text-steel-400 hover:text-white" : "text-fg-3 hover:text-fg"
          )}
        >
          <Eraser className="h-3.5 w-3.5" /> Clear
        </button>
      </div>
    </div>
  )
}
