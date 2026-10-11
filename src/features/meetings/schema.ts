import { z } from "zod"

const DAY = /^\d{4}-\d{2}-\d{2}$/
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/

export const meetingSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(2, "Enter a title.").max(80),
  date: z.string().regex(DAY, "Choose a date."),
  startTime: z
    .string()
    .trim()
    .refine((v) => v === "" || TIME.test(v), "Enter a valid time."),
  location: z.string().trim().max(120),
  notes: z.string().trim().max(500),
})

export type MeetingInput = z.infer<typeof meetingSchema>

export const meetingIdSchema = z.object({ id: z.string().min(1) })

export const meetingStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["OPEN", "CLOSED"]),
})
