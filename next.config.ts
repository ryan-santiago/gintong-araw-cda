import type { NextConfig } from "next"

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Camera is used for member selfies (and QR scanning in Phase 4).
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
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
