import "server-only"

import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { APIError, createAuthMiddleware } from "better-auth/api"
import { nextCookies } from "better-auth/next-js"

import { env } from "@/env"
import { audit } from "@/lib/audit"
import { db } from "@/lib/db"

function requestInfo(request?: Request | null) {
  return {
    ipAddress: request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: request?.headers.get("user-agent") ?? null,
  }
}

export const auth = betterAuth({
  appName: "Gintong Araw CDA",
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: (env.BETTER_AUTH_TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  database: prismaAdapter(db, { provider: "postgresql" }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    // New registrations wait for admin approval, so never sign them in.
    autoSignIn: false,
    requireEmailVerification: false,
  },

  user: {
    additionalFields: {
      status: { type: "string", input: false, defaultValue: "PENDING" },
      mustChangePassword: { type: "boolean", input: false, defaultValue: false },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // slide expiry once a day
  },

  rateLimit: {
    enabled: true,
    storage: "database", // shared across Vercel instances
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 300, max: 5 },
      "/change-password": { window: 60, max: 5 },
    },
  },

  // The app sends no email: password resets are done by an admin.
  disabledPaths: [
    "/request-password-reset",
    "/reset-password",
    "/send-verification-email",
    "/verify-email",
    "/change-email",
    "/delete-user",
  ],

  databaseHooks: {
    user: {
      create: {
        after: async (user, ctx) => {
          await audit({
            actorId: user.id,
            action: "user.register",
            entityType: "User",
            entityId: user.id,
            after: { name: user.name, email: user.email },
            request: requestInfo(ctx?.request),
          })
        },
      },
    },
    session: {
      create: {
        // Only approved, active users may hold a session.
        before: async (session) => {
          const user = await db.user.findUnique({ where: { id: session.userId }, select: { status: true } })
          if (user?.status === "PENDING") {
            throw new APIError("FORBIDDEN", {
              code: "ACCOUNT_PENDING",
              message: "Your account is waiting for an administrator's approval.",
            })
          }
          if (user?.status !== "ACTIVE") {
            throw new APIError("FORBIDDEN", {
              code: "ACCOUNT_SUSPENDED",
              message: "Your account has been suspended. Please contact an administrator.",
            })
          }
        },
        after: async (session, ctx) => {
          await db.user.update({ where: { id: session.userId }, data: { lastLoginAt: new Date() } })
          await audit({
            actorId: session.userId,
            action: "auth.login",
            entityType: "User",
            entityId: session.userId,
            request: ctx?.request
              ? requestInfo(ctx.request)
              : { ipAddress: session.ipAddress, userAgent: session.userAgent },
          })
        },
      },
    },
  },

  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-in/email") return
      const returned = ctx.context.returned
      if (returned instanceof APIError && returned.status === "UNAUTHORIZED") {
        const email = typeof ctx.body?.email === "string" ? ctx.body.email.toLowerCase().slice(0, 200) : null
        await audit({
          action: "auth.login_failed",
          entityType: "User",
          metadata: { email },
          request: requestInfo(ctx.request),
        })
      }
    }),
  },

  plugins: [nextCookies()], // must stay last
})

export type Session = typeof auth.$Infer.Session
