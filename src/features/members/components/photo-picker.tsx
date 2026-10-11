"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import {
  Camera,
  Check,
  ImageUp,
  Loader2,
  RefreshCw,
  Sparkles,
  SwitchCamera,
  Trash2,
  Undo2,
  UserRound,
} from "lucide-react"
import Cropper, { type Area } from "react-easy-crop"
import Webcam from "react-webcam"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { removeBackground } from "@/features/members/lib/remove-background"

export type PhotoChange = { kind: "keep" } | { kind: "set"; blob: Blob; previewUrl: string } | { kind: "remove" }

// Portrait 3:4, matching the ID card photo window. The server makes the 600×800 and 128px versions.
const OUTPUT = { width: 900, height: 1200 }

async function cropToBlob(src: string, area: Area): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new window.Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
  const canvas = document.createElement("canvas")
  canvas.width = OUTPUT.width
  canvas.height = OUTPUT.height
  const ctx = canvas.getContext("2d")!
  ctx.imageSmoothingQuality = "high"
  ctx.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, OUTPUT.width, OUTPUT.height)
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not process photo"))), "image/jpeg", 0.9)
  )
}

/**
 * Phones (and any page without a secure connection) use the device's own camera app through a
 * file input with `capture` — it works over plain http:// and gives the best phone camera UI.
 * Laptops/desktops on https:// or localhost use the in-page webcam dialog.
 */
function prefersNativeCamera() {
  if (typeof window === "undefined") return false
  const live = window.isSecureContext && !!navigator.mediaDevices?.getUserMedia
  const touch = window.matchMedia("(pointer: coarse)").matches
  return !live || touch
}

export function PhotoPicker({
  currentUrl,
  value,
  onChange,
  disabled,
}: {
  currentUrl: string | null
  value: PhotoChange
  onChange: (change: PhotoChange) => void
  disabled?: boolean
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const captureRef = useRef<HTMLInputElement>(null)
  const [source, setSource] = useState<string | null>(null) // image being cropped
  const [cameraOpen, setCameraOpen] = useState(false)

  const preview = value.kind === "set" ? value.previewUrl : value.kind === "remove" ? null : currentUrl

  // Free object URLs we created.
  useEffect(() => {
    return () => {
      if (value.kind === "set") URL.revokeObjectURL(value.previewUrl)
    }
  }, [value])

  function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setSource(String(reader.result))
    reader.readAsDataURL(file)
  }

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:gap-5">
      <div className="relative aspect-[3/4] w-28 shrink-0 overflow-hidden rounded-2xl bg-muted ring-1 ring-border">
        {preview ? (
          <Image src={preview} alt="Member photo" fill unoptimized className="object-cover" />
        ) : (
          <div className="grid size-full place-items-center text-muted-foreground">
            <UserRound className="size-12" />
          </div>
        )}
      </div>

      <div className="grid w-full gap-2 sm:w-auto">
        <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
          <Button type="button" variant="outline" disabled={disabled} onClick={() => fileRef.current?.click()}>
            <ImageUp /> Upload
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={() => (prefersNativeCamera() ? captureRef.current?.click() : setCameraOpen(true))}
          >
            <Camera /> Take photo
          </Button>
          {preview && (
            <Button
              type="button"
              variant="ghost"
              disabled={disabled}
              onClick={() => onChange(currentUrl && value.kind !== "remove" ? { kind: "remove" } : { kind: "keep" })}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 /> Remove
            </Button>
          )}
          {value.kind !== "keep" && currentUrl && (
            <Button type="button" variant="ghost" disabled={disabled} onClick={() => onChange({ kind: "keep" })}>
              <RefreshCw /> Undo
            </Button>
          )}
        </div>
        <p className="text-center text-xs text-muted-foreground sm:text-left">
          A clear, front-facing photo. It&apos;s used on the member&apos;s ID card.
        </p>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={onFile} />
        {/* Opens the phone's camera app (front camera) directly. */}
        <input ref={captureRef} type="file" accept="image/*" capture="user" hidden onChange={onFile} />
      </div>

      {cameraOpen && (
        <CameraDialog
          onUseDeviceCamera={() => {
            setCameraOpen(false)
            captureRef.current?.click()
          }}
          onClose={() => setCameraOpen(false)}
          onCapture={(shot) => {
            setCameraOpen(false)
            setSource(shot)
          }}
        />
      )}
      {source && (
        <CropDialog
          src={source}
          onCancel={() => setSource(null)}
          onDone={(blob) => {
            setSource(null)
            onChange({ kind: "set", blob, previewUrl: URL.createObjectURL(blob) })
          }}
        />
      )}
    </div>
  )
}

function CameraDialog({
  onClose,
  onCapture,
  onUseDeviceCamera,
}: {
  onClose: () => void
  onCapture: (dataUrl: string) => void
  onUseDeviceCamera: () => void
}) {
  const webcam = useRef<Webcam>(null)
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user")
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Take photo</DialogTitle>
          <DialogDescription>Center the face in the frame with good lighting.</DialogDescription>
        </DialogHeader>
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-black">
          {error ? (
            <div className="grid size-full place-items-center content-center gap-3 p-6 text-center text-sm text-white/80">
              <p>{error}</p>
              <Button type="button" variant="secondary" onClick={onUseDeviceCamera}>
                <Camera /> Use device camera instead
              </Button>
            </div>
          ) : (
            <>
              <Webcam
                ref={webcam}
                audio={false}
                mirrored={facingMode === "user"}
                screenshotFormat="image/jpeg"
                screenshotQuality={0.92}
                forceScreenshotSourceSize
                videoConstraints={{ facingMode, width: { ideal: 1280 }, height: { ideal: 1280 } }}
                onUserMedia={() => setReady(true)}
                onUserMediaError={() =>
                  setError(
                    window.isSecureContext
                      ? "Camera unavailable. Allow camera access for this site in your browser settings."
                      : "The live camera only works on a secure (https://) connection."
                  )
                }
                className="size-full object-cover"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-[12%] rounded-full border-2 border-white/60"
              />
            </>
          )}
        </div>
        <DialogFooter className="sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setReady(false)
              setFacingMode((m) => (m === "user" ? "environment" : "user"))
            }}
            disabled={!!error}
          >
            <SwitchCamera /> Switch camera
          </Button>
          <Button
            type="button"
            disabled={!ready || !!error}
            onClick={() => {
              const shot = webcam.current?.getScreenshot()
              if (shot) onCapture(shot)
            }}
          >
            <Camera /> Capture
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CropDialog({ src, onCancel, onDone }: { src: string; onCancel: () => void; onDone: (blob: Blob) => void }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [area, setArea] = useState<Area | null>(null)
  const [busy, setBusy] = useState(false)
  const [edited, setEdited] = useState<string | null>(null) // photo with background removed
  const [bgState, setBgState] = useState<{ busy: boolean; error: string | null }>({ busy: false, error: null })
  const onCropComplete = useCallback((_: Area, pixels: Area) => setArea(pixels), [])
  const image = edited ?? src

  async function done() {
    if (!area) return
    setBusy(true)
    try {
      onDone(await cropToBlob(image, area))
    } finally {
      setBusy(false)
    }
  }

  async function onRemoveBackground() {
    setBgState({ busy: true, error: null })
    try {
      setEdited(await removeBackground(src))
      setBgState({ busy: false, error: null })
    } catch (e) {
      setBgState({
        busy: false,
        error: e instanceof Error && e.message.includes("person") ? e.message : "Background removal failed. Try again.",
      })
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Crop photo</DialogTitle>
          <DialogDescription>Drag to position. Use the slider or pinch to zoom.</DialogDescription>
        </DialogHeader>
        <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-black">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={3 / 4}
            cropShape="rect"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          aria-label="Zoom"
          className="w-full accent-(--primary)"
        />
        <div className="grid gap-1.5">
          {edited ? (
            <Button type="button" variant="outline" onClick={() => setEdited(null)} disabled={busy}>
              <Undo2 /> Restore original background
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={onRemoveBackground} disabled={bgState.busy || busy}>
              {bgState.busy ? <Loader2 className="animate-spin" /> : <Sparkles />}
              {bgState.busy ? "Removing background…" : "Remove background"}
            </Button>
          )}
          {bgState.error ? (
            <p className="text-center text-xs text-destructive">{bgState.error}</p>
          ) : (
            !edited && (
              <p className="text-center text-xs text-muted-foreground">
                Replaces the background with white. The first use on a device downloads about 29 MB.
              </p>
            )
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" onClick={done} disabled={!area || busy}>
            {busy ? <Loader2 className="animate-spin" /> : <Check />}
            Use photo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
