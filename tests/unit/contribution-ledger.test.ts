import { describe, expect, it } from "vitest"

import {
  addMonths,
  buildLedger,
  formatMonth,
  formatPeso,
  memberStartMonth,
  rateFor,
  type Schedule,
} from "@/features/contributions/ledger"

const schedule: Schedule = {
  startMonth: "2026-01",
  rates: [
    { from: "2026-11", amount: 1500 },
    { from: "2026-01", amount: 1000 },
  ],
}
const P = (pesos: number) => pesos * 100
const ledger = (totalPaid: number, opts: Partial<{ start: string; end: string; current: string }> = {}) =>
  buildLedger({
    schedule,
    startMonth: opts.start ?? "2026-01",
    endMonth: opts.end ?? opts.current ?? "2026-11",
    currentMonth: opts.current ?? "2026-11",
    totalPaid,
  })

describe("months and rates", () => {
  it("adds months across years", () => {
    expect(addMonths("2026-12", 1)).toBe("2027-01")
    expect(addMonths("2026-01", -1)).toBe("2025-12")
    expect(addMonths("2026-03", 24)).toBe("2028-03")
  })

  it("uses the rate in effect for each month", () => {
    expect(rateFor("2026-10", schedule.rates)).toBe(P(1000))
    expect(rateFor("2026-11", schedule.rates)).toBe(P(1500))
    expect(rateFor("2027-06", schedule.rates)).toBe(P(1500))
    expect(rateFor("2025-12", schedule.rates)).toBe(0)
  })

  it("starts at the later of the schedule start and Member Since", () => {
    expect(memberStartMonth(schedule, null)).toBe("2026-01")
    expect(memberStartMonth(schedule, new Date("2019-05-01T00:00:00Z"))).toBe("2026-01")
    expect(memberStartMonth(schedule, new Date("2026-06-15T00:00:00Z"))).toBe("2026-06")
  })

  it("formats pesos and months", () => {
    expect(formatPeso(P(1500))).toBe("₱1,500")
    expect(formatPeso(150050)).toBe("₱1,500.50")
    expect(formatMonth("2026-11")).toBe("Nov 2026")
    expect(formatMonth("2026-11", "long")).toBe("November 2026")
  })
})

describe("ledger", () => {
  it("owes Jan–Oct at ₱1,000 and Nov at ₱1,500", () => {
    const l = ledger(0)
    expect(l.months).toHaveLength(11)
    expect(l.totalDue).toBe(P(11500))
    expect(l.balance).toBe(P(11500))
    expect(l.paidThrough).toBeNull()
    expect(l.overdueMonths).toBe(10) // the current month isn't overdue yet
  })

  it("applies payments oldest month first, including partial months", () => {
    const l = ledger(P(10500))
    expect(l.paidThrough).toBe("2026-10")
    expect(l.months.at(-1)).toMatchObject({ month: "2026-11", due: P(1500), paid: P(500), status: "partial" })
    expect(l.balance).toBe(P(1000))
    expect(l.overdueMonths).toBe(0)
  })

  it("treats a fully paid ledger as settled", () => {
    const l = ledger(P(11500))
    expect(l.balance).toBe(0)
    expect(l.credit).toBe(0)
    expect(l.paidThrough).toBe("2026-11")
  })

  it("turns overpayment into advance months", () => {
    const l = ledger(P(11500 + 3000 + 700))
    expect(l.credit).toBe(P(3700))
    expect(l.paidThrough).toBe("2027-01")
    expect(l.months.at(-1)).toMatchObject({ month: "2027-02", paid: P(700), status: "partial" })
    expect(l.balance).toBe(0)
  })

  it("stops owing after deactivation and shows no advance months", () => {
    const l = ledger(P(5000), { end: "2026-03", current: "2026-11" })
    expect(l.months.map((m) => m.month)).toEqual(["2026-01", "2026-02", "2026-03"])
    expect(l.credit).toBe(P(2000))
    expect(l.balance).toBe(0)
  })

  it("owes nothing for a household that starts after the current month", () => {
    const l = ledger(0, { start: "2026-12", current: "2026-11" })
    expect(l.months).toEqual([])
    expect(l.totalDue).toBe(0)
    expect(l.balance).toBe(0)
  })

  it("shows advance months for a household that starts next month", () => {
    const l = ledger(P(1500), { start: "2026-12", current: "2026-11" })
    expect(l.months).toEqual([{ month: "2026-12", due: P(1500), paid: P(1500), status: "paid" }])
    expect(l.credit).toBe(P(1500))
  })
})
