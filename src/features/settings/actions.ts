"use server"

import { settingsSchema } from "@/features/settings/schema"
import { writeAudit } from "@/lib/audit"
import { db } from "@/lib/db"
import { actionClient } from "@/lib/safe-action"

export const saveSettings = actionClient
  .metadata({ name: "saveSettings", permission: "settings.manage" })
  .inputSchema(settingsSchema)
  .action(async ({ parsedInput, ctx: { viewer } }) => {
    await db.$transaction(async (tx) => {
      const before = Object.fromEntries((await tx.setting.findMany()).map((r) => [r.key, r.value]))
      const changed: Record<string, { before: unknown; after: unknown }> = {}
      for (const [key, value] of Object.entries(parsedInput)) {
        if (JSON.stringify(before[key]) === JSON.stringify(value)) continue
        changed[key] = { before: before[key] ?? null, after: value }
        await tx.setting.upsert({
          where: { key },
          create: { key, value, updatedBy: viewer.id },
          update: { value, updatedBy: viewer.id },
        })
      }
      if (Object.keys(changed).length) {
        await writeAudit(tx, {
          actorId: viewer.id,
          action: "settings.update",
          entityType: "Setting",
          before: Object.fromEntries(Object.entries(changed).map(([k, v]) => [k, v.before])),
          after: Object.fromEntries(Object.entries(changed).map(([k, v]) => [k, v.after])),
        })
      }
    })
    return { ok: true }
  })
