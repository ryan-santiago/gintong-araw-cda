import "server-only"

import { PrismaNeon } from "@prisma/adapter-neon"

import { env } from "@/env"
import { PrismaClient } from "@/generated/prisma/client"

function createPrismaClient() {
  const adapter = new PrismaNeon({ connectionString: env.DATABASE_URL })
  return new PrismaClient({ adapter })
}

// Reuse one client across hot reloads in development.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db
