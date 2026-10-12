"use client"

import { useRef, useState } from "react"
import { setZXingModuleOverrides, Scanner } from "@yudiel/react-qr-scanner"
import { CameraOff, Keyboard } from "lucide-react"

import { Button } from "@/components/ui/button"

// QR decoding falls back to a WASM reader on browsers without a native BarcodeDetector (e.g. iPhone).
// Serve it from our own domain instead of a public CDN (copied by scripts/copy-vendor-wasm.mjs).
setZXingModuleOverrides({
  locateFile: (file: string, prefix: string) => (file.endsWith(".wasm") ? "/zxing/zxing_reader.wasm" : prefix + file),
})

const SAME_CODE_COOLDOWN_MS = 3000

function cameraErrorMessage(kind: string | undefined) {
  if (typeof window !== "undefined" && !window.isSecureContext) kind = "insecure-context"
  switch (kind) {
    case "insecure-context":
      return "The camera needs a secure (https://) connection. Open the app from its https:// address, or use manual entry."
    case "permission-denied":
      return "Camera access was blocked. Allow the camera for this site in your browser settings, or use manual entry."
    case "no-camera":
      return "No camera was found on this device. Use manual entry."
    case "in-use":
      return "The camera is being used by another app. Close it and try again, or use manual entry."
    default:
      return "The camera couldn't start. Reload the page to try again, or use manual entry."
  }
}

let audio: AudioContext | null = null

/** Short tones + vibration for scan feedback. */
export function beep(kind: "ok" | "warn" | "error") {
  try {
    audio ??= new AudioContext()
    const tones = kind === "ok" ? [880, 1320] : kind === "warn" ? [660, 660] : [220]
    tones.forEach((freq, i) => {
      const osc = audio!.createOscillator()
      const gain = audio!.createGain()
      osc.type = kind === "error" ? "square" : "sine"
      osc.frequency.value = freq
      const start = audio!.currentTime + i * 0.13
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + (kind === "error" ? 0.35 : 0.11))
      osc.connect(gain).connect(audio!.destination)
      osc.start(start)
      osc.stop(start + 0.4)
    })
    navigator.vibrate?.(kind === "ok" ? 60 : kind === "warn" ? [60, 60, 60] : 250)
  } catch {
    // Sound is a nice-to-have.
  }
}

/**
 * Rear-camera QR reader filling its container. Calls `onCode` once per code (the same code is
 * ignored for a few seconds) and never while a previous `onCode` is still running.
 */
export function QrCamera({
  onCode,
  paused,
  onManual,
  children,
}: {
  onCode: (text: string) => Promise<void>
  paused?: boolean
  onManual: () => void
  /** Overlay content (e.g. the last result). */
  children?: React.ReactNode
}) {
  const [error, setError] = useState<string | null>(null)
  const busy = useRef(false)
  const last = useRef<{ text: string; at: number } | null>(null)

  if (error) {
    return (
      <div className="grid aspect-square place-items-center content-center gap-3 bg-black p-6 text-center text-sm text-white/80 sm:aspect-video">
        <CameraOff className="mx-auto size-8" />
        <p>{error}</p>
        <Button variant="secondary" onClick={onManual}>
          <Keyboard /> Use manual entry
        </Button>
      </div>
    )
  }

  return (
    <div className="relative aspect-square max-h-[58svh] w-full bg-black sm:aspect-video">
      <Scanner
        onScan={async (codes) => {
          const text = codes[0]?.rawValue
          if (!text || busy.current) return
          const now = Date.now()
          if (last.current && last.current.text === text && now - last.current.at < SAME_CODE_COOLDOWN_MS) return
          last.current = { text, at: now }
          busy.current = true
          try {
            await onCode(text)
          } finally {
            busy.current = false
          }
        }}
        onError={(e) => {
          console.warn("QR scanner error", e?.kind, e?.message, e?.cause)
          setError(cameraErrorMessage(e?.kind))
        }}
        // Only "ideal" sizes: the library default demands min 640px height, which rejects 480p webcams.
        constraints={{ facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }}
        formats={["qr_code"]}
        allowMultiple
        scanDelay={500}
        sound={false}
        paused={paused}
        components={{ finder: true, torch: false, zoom: false, onOff: false }}
        styles={{ container: { width: "100%", height: "100%" }, video: { objectFit: "cover" } }}
      />
      {children && <div className="absolute inset-x-3 bottom-3 z-10">{children}</div>}
    </div>
  )
}
