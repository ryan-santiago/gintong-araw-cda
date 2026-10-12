// Contribution math — pure functions shared by server and client (no DB access).
// Months are "YYYY-MM" strings; money is integer centavos. See docs/11-contributions.md.

export type Month = string // "YYYY-MM"

export type Rate = { from: Month; amount: number } // amount in pesos (as configured in Settings)

export type Schedule = { startMonth: Month; rates: Rate[] }

export type LedgerMonth = { month: Month; due: number; paid: number; status: "paid" | "partial" | "unpaid" }

export type Ledger = {
  /** From the member's start month through the current month, plus any months covered in advance. */
  months: LedgerMonth[]
  totalDue: number
  totalPaid: number
  /** Amount still owed through the current month (0 when fully paid). */
  balance: number
  /** Amount paid beyond the current month. */
  credit: number
  /** Last month fully paid with every earlier month also paid; null when the first month isn't fully paid. */
  paidThrough: Month | null
  /** Months before the current month that are not fully paid. */
  overdueMonths: number
  startMonth: Month
  endMonth: Month
}

export const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/

export const toCentavos = (pesos: number) => Math.round(pesos * 100)

export function addMonths(month: Month, n: number): Month {
  const [y, m] = month.split("-").map(Number)
  const index = y! * 12 + (m! - 1) + n
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`
}

/** "2026-03-15" or a Date (UTC calendar date) → "2026-03". */
export function monthOf(day: string | Date): Month {
  return (typeof day === "string" ? day : day.toISOString()).slice(0, 7)
}

export const maxMonth = (a: Month, b: Month) => (a > b ? a : b)

/** Monthly due (centavos) for a month: the latest rate that took effect on or before it. */
export function rateFor(month: Month, rates: Rate[]): number {
  let amount = 0
  for (const rate of [...rates].sort((a, b) => a.from.localeCompare(b.from))) {
    if (rate.from <= month) amount = rate.amount
  }
  return toCentavos(amount)
}

/** The first month a household owes: the later of the schedule start and its Member Since month. */
export function memberStartMonth(schedule: Schedule, memberSince: Date | null): Month {
  return memberSince ? maxMonth(schedule.startMonth, monthOf(memberSince)) : schedule.startMonth
}

/** Last month a household owes: the current month, or the month it was deactivated. */
export function memberEndMonth(currentMonth: Month, deactivatedAt: Date | null, manilaMonthOf: (d: Date) => Month) {
  return deactivatedAt ? manilaMonthOf(deactivatedAt) : currentMonth
}

const MAX_ADVANCE_MONTHS = 36

/**
 * Applies the total paid to months oldest-first. Payments are not tied to a month when recorded,
 * so voiding one or changing a past rate simply re-flows the ledger.
 */
export function buildLedger(input: {
  schedule: Schedule
  startMonth: Month
  endMonth: Month
  currentMonth: Month
  totalPaid: number
}): Ledger {
  const { schedule, startMonth, endMonth, currentMonth, totalPaid } = input
  const months: LedgerMonth[] = []
  let remaining = totalPaid
  let totalDue = 0
  let paidThrough: Month | null = null
  let overdueMonths = 0
  let contiguous = true

  const apply = (month: Month) => {
    const due = rateFor(month, schedule.rates)
    const paid = Math.min(due, Math.max(remaining, 0))
    remaining -= paid
    const status = paid >= due ? "paid" : paid > 0 ? "partial" : "unpaid"
    if (status === "paid" && contiguous) paidThrough = month
    else contiguous = false
    months.push({ month, due, paid, status })
    return { due, status }
  }

  for (let month = startMonth; month <= endMonth; month = addMonths(month, 1)) {
    const { due, status } = apply(month)
    totalDue += due
    if (month < currentMonth && status !== "paid") overdueMonths++
  }

  // Advance payments: show the future months they cover (active members only).
  const credit = Math.max(remaining, 0)
  if (endMonth === currentMonth) {
    let month = addMonths(endMonth < startMonth ? addMonths(startMonth, -1) : endMonth, 1)
    for (let i = 0; remaining > 0 && i < MAX_ADVANCE_MONTHS; i++, month = addMonths(month, 1)) {
      if (rateFor(month, schedule.rates) === 0) break
      apply(month)
    }
  }

  return {
    months,
    totalDue,
    totalPaid,
    balance: Math.max(totalDue - totalPaid, 0),
    credit,
    paidThrough,
    overdueMonths,
    startMonth,
    endMonth,
  }
}

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 2 })

/** 150000 → "₱1,500.00"; whole pesos drop the decimals ("₱1,500"). */
export function formatPeso(centavos: number) {
  const value = centavos / 100
  return Number.isInteger(value) ? peso.format(value).replace(/\.00$/, "") : peso.format(value)
}

/** "2026-11" → "Nov 2026" (or "November 2026" with long). */
export function formatMonth(month: Month, style: "short" | "long" = "short") {
  const [y, m] = month.split("-").map(Number)
  return new Intl.DateTimeFormat("en-PH", { month: style, year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y!, m! - 1, 1))
  )
}

export const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "GCASH", label: "GCash" },
  { value: "BANK", label: "Bank transfer" },
  { value: "OTHER", label: "Other" },
] as const

export type PaymentMethodValue = (typeof PAYMENT_METHODS)[number]["value"]

export const paymentMethodLabel = (value: string) => PAYMENT_METHODS.find((m) => m.value === value)?.label ?? value
