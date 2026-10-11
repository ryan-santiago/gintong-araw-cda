import type { NextConfig } from "next"

const isDev = process.env.NODE_ENV !== "production"

// Content-Security-Policy: only our own origin, plus R2 signed photo links.
// - 'unsafe-inline' scripts: Next.js inline bootstrap scripts (no nonce, so pages stay static/PPR-friendly)
// - 'wasm-unsafe-eval': QR decoding (zxing) and background removal (MediaPipe) run WebAssembly
// - blob:/data: images: the photo cropper, camera snapshots and background-removed previews
const r2 = "https://*.r2.cloudflarestorage.com"
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${r2}`,
  "font-src 'self' data:",
  `connect-src 'self' blob: data: ${r2}${isDev ? " ws: wss:" : ""}`,
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ")

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // Camera: member selfies and attendance QR scanning.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=()" },
]

// Extra hostnames (e.g. your PC's LAN IP) allowed to load the dev server — for testing on a phone.
const devOrigins = (process.env.DEV_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)

const nextConfig: NextConfig = {
  allowedDevOrigins: devOrigins,
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // ID card rendering reads these at runtime; make sure they ship with the functions.
  outputFileTracingIncludes: {
    "/api/members/**/*": ["./src/features/id-card/assets/*"],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }]
  },
}

export default nextConfig
