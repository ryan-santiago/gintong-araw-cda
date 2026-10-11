import { describe, expect, it } from "vitest"

import { dateToDay, dayToDate, formatDay, formatManila, manilaDateTime, manilaDayRange } from "@/lib/dates"

describe("Manila dates", () => {
  it("formats instants in Manila time (UTC+8)", () => {
    expect(formatManila("2026-10-11T16:30:00Z", "yyyy-MM-dd HH:mm")).toBe("2026-10-12 00:30")
  })

  it("gives a Manila day as UTC bounds", () => {
    const { start, end } = manilaDayRange("2026-10-12")
    expect(start.toISOString()).toBe("2026-10-11T16:00:00.000Z")
    expect(end.toISOString()).toBe("2026-10-12T16:00:00.000Z")
  })

  it("rolls the day range over month ends", () => {
    expect(manilaDayRange("2026-10-31").end.toISOString()).toBe("2026-10-31T16:00:00.000Z")
  })

  it("combines a Manila day and time", () => {
    expect(manilaDateTime("2026-10-12", "09:30").toISOString()).toBe("2026-10-12T01:30:00.000Z")
  })

  it("round-trips @db.Date values", () => {
    expect(dateToDay(dayToDate("2026-02-28"))).toBe("2026-02-28")
    expect(formatDay(dayToDate("2026-10-12"))).toBe("Mon, Oct 12, 2026")
  })
})
