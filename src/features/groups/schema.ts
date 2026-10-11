import { z } from "zod"

import { PERMISSION_KEYS } from "@/lib/permissions"

export const groupSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Use at least 2 characters.").max(50, "Use at most 50 characters."),
  description: z.string().trim().max(200, "Use at most 200 characters."),
  rank: z.coerce
    .number<number>({ error: "Enter a number." })
    .int("Use a whole number.")
    .min(1, "Rank 0 is reserved for Super Admin.")
    .max(999, "Use 999 or lower."),
  permissions: z.array(z.enum(PERMISSION_KEYS)),
})

export type GroupInput = z.infer<typeof groupSchema>

export const groupIdSchema = z.object({ id: z.string().min(1) })
