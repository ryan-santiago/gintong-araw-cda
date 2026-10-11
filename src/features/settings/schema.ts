import { z } from "zod"

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const

export const settingsSchema = z.object({
  meetingDay: z.coerce.number<number>().int().min(0).max(6),
  meetingTitle: z.string().trim().min(2, "Enter a title.").max(80),
  meetingTime: z
    .string()
    .trim()
    .refine((v) => v === "" || /^([01]\d|2[0-3]):[0-5]\d$/.test(v), "Enter a valid time."),
  meetingLocation: z.string().trim().max(120),
  atRiskThreshold: z.coerce
    .number<number>({ error: "Enter a number." })
    .int("Use a whole number.")
    .min(1, "Use 1 or more.")
    .max(20, "Use 20 or fewer."),
})

export type AppSettings = z.infer<typeof settingsSchema>

export const DEFAULT_SETTINGS: AppSettings = {
  meetingDay: 0, // Sunday
  meetingTitle: "General Assembly",
  meetingTime: "",
  meetingLocation: "",
  atRiskThreshold: 3,
}
