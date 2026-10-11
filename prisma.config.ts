import { config } from "dotenv"
import { defineConfig } from "prisma/config"

// Same precedence as Next.js: .env.local overrides .env
config({ path: [".env.local", ".env"], quiet: true })

// The CLI (migrate, studio) uses the DIRECT connection. The app uses the pooled
// DATABASE_URL through the Neon driver adapter in src/lib/db.ts.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
})
