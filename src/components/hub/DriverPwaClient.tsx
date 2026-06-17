"use client"

import { useEffect, useRef, useState } from "react"
import { Camera, CheckCircle2, RotateCcw, UploadCloud } from "lucide-react"

export function DriverPwaClient() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [secure, setSecure] = useState(false)
  const [cameraState, setCameraState] = useState<"idle" | "ready" | "saved" | "error">("idle")
  const [message, setMessage] = useState("Camera is ready on HTTPS tunnel or Vercel preview.")

  useEffect(() => {
    setSecure(window.isSecureContext)
    if ("serviceWorker" in navigator && window.isSecureContext) {
      navigator.serviceWorker.register("/hub-sw.js").catch(() => {
        // The page still works; install prompt may be unavailable until SW registers.
      })
    }
  }, [])

  async function startCamera() {
    try {
      if (!window.isSecureContext) {
        setMessage("iOS requires HTTPS for camera/PWA. Use npm run dev:mobile or Vercel preview.")
        setCameraState("error")
        return
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
      if (videoRef.current) videoRef.current.srcObject = stream
      setMessage("Camera opened. Tap Save POD to simulate offline-safe upload queue.")
      setCameraState("ready")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Camera permission failed")
      setCameraState("error")
    }
  }

  function savePod() {
    setMessage("Saved — will sync when online. Sandbox POD queued for office timeline.")
    setCameraState("saved")
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-gold">PWA status</p>
        <p className="mt-2 text-sm text-steel-100">
          {secure ? "Secure context detected — camera, service worker, and Add to Home Screen are enabled." : "Not secure — use the HTTPS tunnel for camera/PWA."}
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
        <video ref={videoRef} autoPlay playsInline muted className="aspect-[4/3] w-full object-cover" />
      </div>

      <div className="grid grid-cols-1 gap-3">
        <button
          onClick={startCamera}
          className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-orange px-5 font-display text-base font-bold uppercase tracking-[0.08em] text-white shadow-cta"
        >
          <Camera className="h-5 w-5" /> Open camera POD
        </button>
        <button
          onClick={savePod}
          disabled={cameraState !== "ready"}
          className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl border border-white/15 px-5 font-display text-base font-bold uppercase tracking-[0.08em] text-white disabled:opacity-50"
        >
          <UploadCloud className="h-5 w-5" /> Save POD
        </button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-navy-800/80 p-4">
        <div className="flex gap-3">
          {cameraState === "saved" ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-300" /> : <RotateCcw className="h-5 w-5 shrink-0 text-gold" />}
          <p className="text-sm text-steel-100">{message}</p>
        </div>
      </div>
    </div>
  )
}
