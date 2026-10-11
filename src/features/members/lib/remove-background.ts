"use client"

// Background removal for member photos, entirely in the browser with Google MediaPipe
// (Apache-2.0, no account or API key). Files are self-hosted under /public/mediapipe:
//   wasm/   — copied from node_modules/@mediapipe/tasks-vision/wasm (keep in sync when upgrading)
//   models/ — selfie_multiclass_256x256.tflite from storage.googleapis.com/mediapipe-models
// The ~29 MB of engine + model download once, the first time the button is used, then stay cached.

import type { ImageSegmenter } from "@mediapipe/tasks-vision"

const WASM_PATH = "/mediapipe/wasm"
const MODEL_PATH = "/mediapipe/models/selfie_multiclass_256x256.tflite"
const MAX_SIDE = 1600 // keep phone photos fast to process

let segmenterPromise: Promise<ImageSegmenter> | null = null

async function createSegmenter(delegate: "GPU" | "CPU") {
  const { FilesetResolver, ImageSegmenter } = await import("@mediapipe/tasks-vision")
  const fileset = await FilesetResolver.forVisionTasks(WASM_PATH)
  return ImageSegmenter.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: MODEL_PATH, delegate },
    runningMode: "IMAGE",
    outputConfidenceMasks: true,
    outputCategoryMask: false,
  })
}

function getSegmenter() {
  segmenterPromise ??= createSegmenter("GPU").catch(() => createSegmenter("CPU"))
  segmenterPromise.catch(() => (segmenterPromise = null)) // allow a retry after a failed download
  return segmenterPromise
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("Could not read the photo."))
    img.src = src
  })
}

const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

/**
 * Replaces everything that isn't the person with a solid colour.
 * Returns a JPEG data URL the cropper can use in place of the original.
 */
export async function removeBackground(src: string, background = "#ffffff"): Promise<string> {
  const [segmenter, image] = await Promise.all([getSegmenter(), loadImage(src)])

  const scale = Math.min(1, MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight))
  const width = Math.round(image.naturalWidth * scale)
  const height = Math.round(image.naturalHeight * scale)

  const source = document.createElement("canvas")
  source.width = width
  source.height = height
  source.getContext("2d")!.drawImage(image, 0, 0, width, height)

  // Multiclass model: mask 0 = background; 1–5 = hair, body skin, face skin, clothes, accessories.
  const result = segmenter.segment(source)
  const masks = result.confidenceMasks
  if (!masks?.length) throw new Error("Couldn't find a person in this photo.")
  const backgroundConfidence = masks[0]!.getAsFloat32Array()
  const maskWidth = masks[0]!.width
  const maskHeight = masks[0]!.height

  // Alpha mask: 1 = person. A soft threshold keeps hair edges natural.
  const alpha = document.createElement("canvas")
  alpha.width = maskWidth
  alpha.height = maskHeight
  const alphaCtx = alpha.getContext("2d")!
  const alphaData = alphaCtx.createImageData(maskWidth, maskHeight)
  let personPixels = 0
  for (let i = 0; i < backgroundConfidence.length; i++) {
    const a = smoothstep(0.3, 0.7, 1 - backgroundConfidence[i]!)
    if (a > 0.5) personPixels++
    alphaData.data[i * 4 + 3] = Math.round(a * 255)
  }
  alphaCtx.putImageData(alphaData, 0, 0)
  masks.forEach((m) => m.close())
  if (personPixels < backgroundConfidence.length * 0.03) throw new Error("Couldn't find a person in this photo.")

  // Person layer = original photo, cut out by the (slightly feathered) mask.
  const person = document.createElement("canvas")
  person.width = width
  person.height = height
  const personCtx = person.getContext("2d")!
  personCtx.drawImage(source, 0, 0)
  personCtx.globalCompositeOperation = "destination-in"
  personCtx.filter = "blur(1px)"
  personCtx.drawImage(alpha, 0, 0, width, height)

  // Final: solid background + person.
  const out = document.createElement("canvas")
  out.width = width
  out.height = height
  const outCtx = out.getContext("2d")!
  outCtx.fillStyle = background
  outCtx.fillRect(0, 0, width, height)
  outCtx.drawImage(person, 0, 0)
  return out.toDataURL("image/jpeg", 0.93)
}
