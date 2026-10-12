import { z } from "zod"

import { MONTH_PATTERN, PAYMENT_METHODS, type PaymentMethodValue, type Schedule } from "@/features/contributions/ledger"

export const SCHEDULE_SETTING_KEY = "contribution.schedule"

export const DEFAULT_SCHEDULE: Schedule = {
  startMonth: "2026-01",
  rates: [
    { from: "2026-01", amount: 1000 },
    { from: "2026-11", amount: 1500 },
  ],
}

const month = z.string().trim().regex(MONTH_PATTERN, "Choose a month.")
const pesos = z.coerce
  .number<number>({ error: "Enter an amount." })
  .positive("Enter an amount above zero.")
  .max(1_000_000, "That amount is too large.")
  .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, "Use at most 2 decimal places.")

export const scheduleSchema = z
  .object({
    startMonth: month,
    rates: z
      .array(z.object({ from: month, amount: pesos }))
      .min(1, "Add at least one rate.")
      .max(50),
  })
  .superRefine((v, ctx) => {
    const froms = v.rates.map((r) => r.from)
    if (new Set(froms).size !== froms.length) {
      ctx.addIssue({ code: "custom", path: ["rates"], message: "Each rate needs a different month." })
    }
    if (!froms.some((f) => f <= v.startMonth)) {
      ctx.addIssue({ code: "custom", path: ["rates"], message: "Add a rate that applies from the start month." })
    }
  })
  .transform((v) => ({ ...v, rates: [...v.rates].sort((a, b) => a.from.localeCompare(b.from)) }))

const DAY = /^\d{4}-\d{2}-\d{2}$/

export const recordPaymentSchema = z.object({
  memberId: z.string().min(1),
  amount: pesos,
  method: z.enum(PAYMENT_METHODS.map((m) => m.value) as [PaymentMethodValue, ...PaymentMethodValue[]]),
  paidOn: z.string().regex(DAY, "Choose the payment date."),
  reference: z.string().trim().max(60),
  notes: z.string().trim().max(200),
  source: z.enum(["QR", "MANUAL"]),
  /** Set after the "recorded a few minutes ago" warning has been confirmed. */
  confirmRepeat: z.boolean().default(false),
})

export type RecordPaymentInput = z.input<typeof recordPaymentSchema>

export const voidPaymentSchema = z.object({
  id: z.string().min(1),
  reason: z.string().trim().min(3, "Say why this payment is being voided.").max(200),
})
