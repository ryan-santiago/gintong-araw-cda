import "server-only"

import { readFile } from "node:fs/promises"
import path from "node:path"

import { parse as parseFont, type Font } from "opentype.js"
import { PDFDocument } from "pdf-lib"
import QRCode from "qrcode"
import sharp, { type Sharp } from "sharp"

import { ARTWORK, CARD_INCHES, FRONT_LAYOUT } from "@/features/id-card/layout"

export type CardData = {
  fullName: string
  position: string
  trackingNumber: string
  blockLot: string
  qrText: string
  photo: Buffer
}

type Side = "front" | "back"

// ─── Assets (cached per server instance) ───────────────────────────────────────

// Literal paths so the bundler can trace exactly these files (see outputFileTracingIncludes too).
const FONT_PATH = path.join(process.cwd(), "src", "features", "id-card", "assets", "arimo-700.woff")
const TEMPLATE_PATHS: Record<Side, string> = {
  front: path.join(process.cwd(), "src", "features", "id-card", "assets", "front-template.png"),
  back: path.join(process.cwd(), "src", "features", "id-card", "assets", "back-template.png"),
}

let fontPromise: Promise<Font> | undefined
function loadFont() {
  fontPromise ??= readFile(FONT_PATH).then((b) =>
    parseFont(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer)
  )
  return fontPromise
}

const artworkCache = new Map<string, Promise<Buffer>>()
function artwork(side: Side, dpi: number) {
  const key = `${side}@${dpi}`
  if (!artworkCache.has(key)) {
    const { width, height } = cardPixels(dpi)
    artworkCache.set(
      key,
      sharp(TEMPLATE_PATHS[side])
        .extract({ left: ARTWORK.x, top: ARTWORK.y, width: ARTWORK.width, height: ARTWORK.height })
        // The template is 2% narrower than a CR80 card; stretch it to the exact card size.
        .resize(width, height, { fit: "fill", kernel: "lanczos3" })
        .png()
        .toBuffer()
    )
  }
  return artworkCache.get(key)!
}

export function cardPixels(dpi: number) {
  return { width: Math.round(CARD_INCHES.width * dpi), height: Math.round(CARD_INCHES.height * dpi) }
}

// ─── Geometry ──────────────────────────────────────────────────────────────────

function scaler(dpi: number) {
  const { width, height } = cardPixels(dpi)
  const sx = width / ARTWORK.width
  const sy = height / ARTWORK.height
  return {
    width,
    height,
    sy,
    x: (v: number) => (v - ARTWORK.x) * sx,
    y: (v: number) => (v - ARTWORK.y) * sy,
    w: (v: number) => v * sx,
    h: (v: number) => v * sy,
  }
}

// ─── Text fitting (template units) ─────────────────────────────────────────────

type FittedText = { size: number; lines: string[] }

function fitText(font: Font, text: string): FittedText {
  const { maxWidth, fontSize, minFontSize } = FRONT_LAYOUT.text
  const width = (t: string, s: number) => font.getAdvanceWidth(t, s)

  for (let s = fontSize; s >= minFontSize; s -= 1) if (width(text, s) <= maxWidth) return { size: s, lines: [text] }

  // Two lines, split at the word boundary that balances them best.
  const words = text.split(" ")
  if (words.length > 1) {
    for (let s = 28; s >= 20; s -= 1) {
      let best: string[] | null = null
      let bestWidth = Infinity
      for (let i = 1; i < words.length; i++) {
        const a = words.slice(0, i).join(" ")
        const b = words.slice(i).join(" ")
        const w = Math.max(width(a, s), width(b, s))
        if (w <= maxWidth && w < bestWidth) {
          best = [a, b]
          bestWidth = w
        }
      }
      if (best) return { size: s, lines: best }
    }
  }

  // Last resort: one line with an ellipsis.
  let cut = text
  while (cut.length > 1 && width(`${cut}…`, minFontSize) > maxWidth) cut = cut.slice(0, -1)
  return { size: minFontSize, lines: [`${cut.trimEnd()}…`] }
}

function textPaths(font: Font, dpi: number, rows: [string, number][]) {
  const g = scaler(dpi)
  const { x, color } = FRONT_LAYOUT.text
  const paths: string[] = []

  for (const [value, baseline] of rows) {
    const fitted = fitText(font, value)
    const size = fitted.size
    let baselines: number[]
    if (fitted.lines.length === 1) {
      baselines = [baseline]
    } else {
      // Centre the two lines on where a single 36px line would sit.
      const centre = baseline - 0.35 * FRONT_LAYOUT.text.fontSize
      const first = centre - 0.19 * size
      baselines = [first, first + 1.1 * size]
    }
    fitted.lines.forEach((line, i) => {
      const p = font.getPath(line, g.x(x), g.y(baselines[i]!), size * g.sy)
      paths.push(p.toPathData(2))
    })
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${g.width}" height="${g.height}"><path fill="${color}" d="${paths.join(" ")}"/></svg>`
}

// ─── Front / back ──────────────────────────────────────────────────────────────

async function renderFrontRaw(data: CardData, dpi: number) {
  const g = scaler(dpi)
  const { photo, qr, text } = FRONT_LAYOUT
  const [base, font] = await Promise.all([artwork("front", dpi), loadFont()])

  const photoW = Math.round(g.w(photo.width))
  const photoH = Math.round(g.h(photo.height))
  const r = g.h(photo.radius)
  // Rounded top corners like the frame; small bottom radius so it tucks behind the "MEMBER ID" tab.
  const rb = g.h(photo.bottomRadius)
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${photoW}" height="${photoH}"><path d="M0 ${r} Q0 0 ${r} 0 H${photoW - r} Q${photoW} 0 ${photoW} ${r} V${photoH - rb} Q${photoW} ${photoH} ${photoW - rb} ${photoH} H${rb} Q0 ${photoH} 0 ${photoH - rb} Z" fill="#fff"/></svg>`
  )
  const photoImg = await sharp(data.photo)
    .rotate()
    .resize(photoW, photoH, { fit: "cover", position: "centre" })
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer()

  const qrSize = Math.round(g.h(qr.size))
  const qrImg = await QRCode.toBuffer(data.qrText, {
    errorCorrectionLevel: "M",
    margin: 0,
    width: qrSize,
    color: { dark: "#000000", light: "#ffffff" },
  })

  const svg = textPaths(font, dpi, [
    [data.fullName, text.rows.name.baseline],
    [data.position, text.rows.position.baseline],
    [data.trackingNumber, text.rows.tracking.baseline],
    [data.blockLot, text.rows.blockLot.baseline],
  ])

  return sharp(base).composite([
    { input: photoImg, left: Math.round(g.x(photo.x)), top: Math.round(g.y(photo.y)) },
    {
      input: qrImg,
      left: Math.round(g.x(qr.x) + (g.w(qr.width) - qrSize) / 2),
      top: Math.round(g.y(qr.y) + (g.h(qr.height) - qrSize) / 2),
    },
    { input: Buffer.from(svg), left: 0, top: 0 },
  ])
}

export type ImageFormat = "png" | "jpg"

/** PNG keeps the transparent rounded corners (soft copy); JPG is flattened on white (print). */
async function encode(image: Sharp, format: ImageFormat, dpi: number) {
  const out = image.withMetadata({ density: dpi })
  return format === "png"
    ? out.png({ compressionLevel: 9 }).toBuffer()
    : out.flatten({ background: "#ffffff" }).jpeg({ quality: 92, chromaSubsampling: "4:4:4" }).toBuffer()
}

export async function renderFront(data: CardData, dpi: number, format: ImageFormat) {
  // composite() can't be chained twice on one pipeline, so materialise first.
  const composed = await (await renderFrontRaw(data, dpi)).png().toBuffer()
  return encode(sharp(composed), format, dpi)
}

export async function renderBack(dpi: number, format: ImageFormat) {
  return encode(sharp(await artwork("back", dpi)), format, dpi)
}

// ─── PDF ───────────────────────────────────────────────────────────────────────

const PT_PER_INCH = 72

/** Print-ready PDF: one page per side at exact card size (3.375 × 2.125 in). */
export async function cardPdf(fronts: Buffer[], back: Buffer | null, title: string) {
  const pdf = await PDFDocument.create()
  pdf.setTitle(title)
  pdf.setCreator("Gintong Araw CDA")
  const width = CARD_INCHES.width * PT_PER_INCH
  const height = CARD_INCHES.height * PT_PER_INCH
  const backImage = back ? await pdf.embedJpg(back) : null // embedded once, reused on every back page

  for (const front of fronts) {
    const image = await pdf.embedJpg(front)
    pdf.addPage([width, height]).drawImage(image, { x: 0, y: 0, width, height })
    if (backImage) pdf.addPage([width, height]).drawImage(backImage, { x: 0, y: 0, width, height })
  }
  return Buffer.from(await pdf.save())
}
