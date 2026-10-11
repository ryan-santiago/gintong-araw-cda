import "server-only"

import { cache } from "react"

import { DEFAULT_SETTINGS, settingsSchema, type AppSettings } from "@/features/settings/schema"
import { db } from "@/lib/db"

/** All settings with defaults filled in. Stored as one row per key in the `setting` table. */
export const getAppSettings = cache(async (): Promise<AppSettings> => {
  const rows = await db.setting.findMany()
  const stored = Object.fromEntries(rows.map((r) => [r.key, r.value]))
  const merged = { ...DEFAULT_SETTINGS, ...stored }
  const parsed = settingsSchema.safeParse(merged)
  return parsed.success ? parsed.data : DEFAULT_SETTINGS
})
