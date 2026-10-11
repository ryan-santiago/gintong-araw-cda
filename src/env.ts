import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"

// Credentials arrive in stages (see docs/02-tech-stack.md), so services that are
// not wired up yet stay optional. Tighten each one when its phase starts.
export const env = createEnv({
  server: {
    // Neon
    DATABASE_URL: z.url(),
    DIRECT_URL: z.url().optional(),

    // Better Auth
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url().optional(),

    // Public address printed in ID card QR links, e.g. https://gintongaraw.coderyan.dev
    APP_URL: z.url().default("http://localhost:3000"),
    // Comma-separated extra origins allowed to sign in, e.g. "http://192.168.1.20:3000" for phone testing.
    BETTER_AUTH_TRUSTED_ORIGINS: z.string().optional(),

    // Cloudflare R2 (private bucket for member photos)
    R2_ACCOUNT_ID: z.string().min(1),
    R2_ACCESS_KEY_ID: z.string().min(1),
    R2_SECRET_ACCESS_KEY: z.string().min(1),
    R2_BUCKET: z.string().min(1),

    // First Super Admin, used once by the seed (Phase 1)
    SEED_ADMIN_EMAIL: z.email().optional(),
    SEED_ADMIN_PASSWORD: z.string().min(10).optional(),
  },
  client: {},
  experimental__runtimeEnv: {},
  emptyStringAsUndefined: true,
})
