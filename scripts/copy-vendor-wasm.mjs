// Copies browser WASM engines from node_modules into public/ so they load from our own domain
// (no third-party CDN at runtime). Runs on every install (postinstall), so versions stay in sync.
//   public/mediapipe/wasm/  ← @mediapipe/tasks-vision (photo background removal)
//   public/zxing/           ← zxing-wasm (QR scanning on browsers without a native BarcodeDetector, e.g. iPhone)
import { cp, mkdir, readdir } from "node:fs/promises"
import path from "node:path"

const mediapipeFrom = "node_modules/@mediapipe/tasks-vision/wasm"
await mkdir("public/mediapipe/wasm", { recursive: true })
for (const name of [
  "vision_wasm_internal.js",
  "vision_wasm_internal.wasm",
  "vision_wasm_nosimd_internal.js",
  "vision_wasm_nosimd_internal.wasm",
]) {
  await cp(`${mediapipeFrom}/${name}`, `public/mediapipe/wasm/${name}`)
}
console.log("✔ MediaPipe wasm → public/mediapipe/wasm")

// pnpm keeps zxing-wasm under node_modules/.pnpm/zxing-wasm@<version>/…
const store = "node_modules/.pnpm"
const dir = (await readdir(store))
  .filter((d) => d.startsWith("zxing-wasm@"))
  .sort()
  .at(-1)
if (!dir) throw new Error("zxing-wasm not found — is @yudiel/react-qr-scanner installed?")
await mkdir("public/zxing", { recursive: true })
await cp(
  path.join(store, dir, "node_modules/zxing-wasm/dist/reader/zxing_reader.wasm"),
  "public/zxing/zxing_reader.wasm"
)
console.log(`✔ ${dir.split("_")[0]} reader → public/zxing/zxing_reader.wasm`)
