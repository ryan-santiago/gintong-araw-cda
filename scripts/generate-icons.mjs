// Generates the favicon / app icons from the association logo.
// Source: design/brand/logo.png. Re-run with a higher-resolution logo: pnpm icons path/to/logo.png
import { copyFile, mkdir, rm } from "node:fs/promises"

import sharp from "sharp"

const source = process.argv[2] ?? "design/brand/logo.png"
const transparent = { r: 0, g: 0, b: 0, alpha: 0 }
const white = { r: 255, g: 255, b: 255, alpha: 1 }

async function squareIcon(size, padding, background, out) {
  const inner = Math.round(size * (1 - padding * 2))
  const logo = await sharp(source)
    .resize(inner, inner, { fit: "contain", background: transparent, kernel: "lanczos3" })
    .toBuffer()
  await sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toFile(out)
  console.log(`✔ ${out} (${size}×${size})`)
}

await mkdir("public/brand", { recursive: true })
await copyFile(source, "public/brand/logo.png")
console.log("✔ public/brand/logo.png")

// Next.js file conventions: app/icon.png → <link rel="icon">, app/apple-icon.png → apple-touch-icon
await squareIcon(256, 0.02, transparent, "src/app/icon.png")
await squareIcon(180, 0.08, white, "src/app/apple-icon.png")

// PWA icons (referenced by src/app/manifest.ts). "maskable" keeps the logo inside the safe zone.
const cream = { r: 244, g: 243, b: 238, alpha: 1 }
await squareIcon(192, 0.06, white, "public/brand/icon-192.png")
await squareIcon(512, 0.06, white, "public/brand/icon-512.png")
await squareIcon(512, 0.2, cream, "public/brand/icon-maskable-512.png")

// Remove the default Next.js favicon so it does not override ours.
await rm("src/app/favicon.ico", { force: true })
