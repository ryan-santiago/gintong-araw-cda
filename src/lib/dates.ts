import { TZDate } from "@date-fns/tz"
import { format } from "date-fns"

export const APP_TIME_ZONE = "Asia/Manila"

/** Format an instant in Manila time, e.g. formatManila(date, "MMM d, yyyy h:mm a"). */
export function formatManila(date: Date | string | number, pattern = "MMM d, yyyy h:mm a") {
  return format(new TZDate(new Date(date).getTime(), APP_TIME_ZONE), pattern)
}

/** Start/end of a Manila calendar day (yyyy-MM-dd) as UTC instants, for range filters. */
export function manilaDayRange(day: string) {
  const [y, m, d] = day.split("-").map(Number)
  const start = new TZDate(y!, m! - 1, d!, APP_TIME_ZONE)
  const end = new TZDate(y!, m! - 1, d! + 1, APP_TIME_ZONE)
  return { start: new Date(start.getTime()), end: new Date(end.getTime()) }
}

/** Today's calendar date in Manila as yyyy-MM-dd. */
export function manilaToday() {
  return formatManila(new Date(), "yyyy-MM-dd")
}

/** The next Sunday (today if it's Sunday) in Manila, as yyyy-MM-dd. */
export function nextSundayManila() {
  const now = new TZDate(Date.now(), APP_TIME_ZONE)
  const add = (7 - now.getDay()) % 7
  return format(new TZDate(now.getFullYear(), now.getMonth(), now.getDate() + add, APP_TIME_ZONE), "yyyy-MM-dd")
}

/** A @db.Date value (stored as UTC midnight) ↔ yyyy-MM-dd. */
export const dayToDate = (day: string) => new Date(`${day}T00:00:00.000Z`)
export const dateToDay = (date: Date) => date.toISOString().slice(0, 10)

/** Formats a @db.Date calendar date, e.g. "Sun, Oct 12, 2026". */
export function formatDay(date: Date, pattern = "EEE, MMM d, yyyy") {
  const [y, m, d] = dateToDay(date).split("-").map(Number)
  return format(new Date(y!, m! - 1, d!), pattern)
}

/** Combines a Manila calendar day and "HH:mm" into a UTC instant. */
export function manilaDateTime(day: string, time: string) {
  const [y, m, d] = day.split("-").map(Number)
  const [hh, mm] = time.split(":").map(Number)
  return new Date(new TZDate(y!, m! - 1, d!, hh!, mm!, APP_TIME_ZONE).getTime())
}
