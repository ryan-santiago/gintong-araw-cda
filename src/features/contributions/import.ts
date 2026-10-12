import "server-only"

import ExcelJS from "exceljs"

import { PAYMENT_METHODS, formatPeso, type PaymentMethodValue } from "@/features/contributions/ledger"
import { dateToDay, dayToDate, formatDay, manilaToday } from "@/lib/dates"
import { db } from "@/lib/db"
import type { ImportRow } from "@/lib/import-types"
import { fullName } from "@/lib/names"
import { norm, readSheet, templateSheet, toDay, type SheetRow } from "@/lib/spreadsheet"

export const PAYMENT_IMPORT_MAX_ROWS = 5000

export const PAYMENT_IMPORT_COLUMNS = [
  { key: "trackingNumber", header: "Tracking No.", aliases: ["tracking number", "tracking"], required: true },
  {
    key: "paidOn",
    header: "Date Paid",
    aliases: ["date", "payment date", "paid on", "date of payment"],
    required: true,
  },
  { key: "amount", header: "Amount", aliases: ["amount paid", "payment"], required: true },
  { key: "method", header: "Method", aliases: ["payment method", "mode of payment"], required: false },
  { key: "reference", header: "Reference", aliases: ["reference no.", "ref no.", "ref"], required: false },
  { key: "notes", header: "Notes", aliases: ["remarks"], required: false },
] as const

type RawRow = SheetRow<typeof PAYMENT_IMPORT_COLUMNS>

export type PaymentImportInput = {
  memberId: string
  amount: number // centavos
  paidOn: string // yyyy-mm-dd
  method: PaymentMethodValue
  reference: string | null
  notes: string | null
}

export function readPaymentFile(file: File) {
  return readSheet(file, PAYMENT_IMPORT_COLUMNS, {
    sheetName: "Payments",
    maxRows: PAYMENT_IMPORT_MAX_ROWS,
    noun: "payment",
  })
}

/** "₱1,000.50", "1000", "1,500" → centavos; null when not a positive amount with at most 2 decimals. */
export function parseAmount(value: string | undefined): number | null {
  const cleaned = (value ?? "").replace(/[₱,\s]|php/gi, "")
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null
  const centavos = Math.round(Number(cleaned) * 100)
  return centavos > 0 && centavos <= 100_000_000 ? centavos : null
}

function toMethod(value: string | undefined): PaymentMethodValue | null {
  if (!value) return "CASH"
  const v = norm(value)
  if (v === "bank" || v === "bank transfer" || v === "bank deposit") return "BANK"
  return PAYMENT_METHODS.find((m) => norm(m.label) === v || norm(m.value) === v)?.value ?? null
}

export async function validatePaymentRows(rows: RawRow[]): Promise<ImportRow<PaymentImportInput>[]> {
  const today = manilaToday()
  const trackingNumbers = [...new Set(rows.map((r) => r.trackingNumber?.trim() ?? "").filter(Boolean))]
  const members = await db.member.findMany({
    where: { trackingNumber: { in: trackingNumbers } },
    select: { id: true, trackingNumber: true, firstName: true, middleName: true, lastName: true, suffix: true },
  })
  const byTracking = new Map(members.map((m) => [m.trackingNumber, m]))

  // Existing payments for these members, to skip rows that were already imported or recorded.
  const existing = new Set(
    (
      await db.contributionPayment.findMany({
        where: { memberId: { in: members.map((m) => m.id) }, voidedAt: null },
        select: { memberId: true, paidOn: true, amount: true },
      })
    ).map((p) => `${p.memberId}|${dateToDay(p.paidOn)}|${p.amount}`)
  )
  const seen = new Set<string>()

  return rows.map((raw) => {
    const errors: string[] = []
    const warnings: string[] = []
    const tracking = raw.trackingNumber?.trim() ?? ""
    const member = byTracking.get(tracking)
    if (!tracking) errors.push("Tracking number is missing.")
    else if (!member) errors.push(`No member has tracking number ${tracking}.`)

    const paidOn = toDay(raw.paidOn)
    if (!paidOn) errors.push(raw.paidOn ? `Date "${raw.paidOn}" — use YYYY-MM-DD.` : "Date paid is missing.")
    else if (paidOn > today) errors.push("Date paid is in the future.")
    else if (paidOn < "2020-01-01") errors.push("Check the date paid.")

    const amount = parseAmount(raw.amount)
    if (amount === null)
      errors.push(raw.amount ? `Amount "${raw.amount}" isn't a valid peso amount.` : "Amount is missing.")

    const method = toMethod(raw.method)
    if (!method) errors.push(`Unknown method "${raw.method}" — use Cash, GCash, Bank transfer or Other.`)

    let status: ImportRow["status"] = errors.length ? "error" : "ok"
    const key = member && paidOn && amount ? `${member.id}|${paidOn}|${amount}` : null
    if (status === "ok" && key && existing.has(key)) {
      status = "duplicate"
      errors.push("A payment with the same member, date and amount is already recorded.")
    } else if (key && seen.has(key)) {
      warnings.push("Same member, date and amount as an earlier row in this file — check it isn't a repeat.")
    }
    if (key) seen.add(key)

    const reference = raw.reference?.trim().slice(0, 60) || null
    const notes = raw.notes?.trim().slice(0, 200) || null
    return {
      row: raw._row,
      status,
      name: member ? fullName(member) : "",
      trackingNumber: tracking,
      detail: [
        amount ? formatPeso(amount) : null,
        paidOn ? formatDay(dayToDate(paidOn), "MMM d, yyyy") : null,
        method ? PAYMENT_METHODS.find((m) => m.value === method)?.label : null,
      ]
        .filter(Boolean)
        .join(" · "),
      errors,
      warnings,
      input:
        status === "ok" && member && paidOn && amount && method
          ? { memberId: member.id, amount, paidOn, method, reference, notes }
          : undefined,
    }
  })
}

export async function paymentImportTemplate() {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = "Gintong Araw CDA"
  const sheet = templateSheet(workbook, "Payments", PAYMENT_IMPORT_COLUMNS, ["trackingNumber", "paidOn", "reference"])
  sheet.addRow({
    trackingNumber: "2026-0001",
    paidOn: "2026-01-05",
    amount: 1000,
    method: "Cash",
    reference: "",
    notes: "",
  })
  sheet.addRow({
    trackingNumber: "2026-0001",
    paidOn: "2026-03-10",
    amount: 2000,
    method: "GCash",
    reference: "1234567890",
    notes: "Feb + Mar",
  })
  sheet.getColumn("amount").numFmt = "#,##0.00"

  const help = workbook.addWorksheet("Instructions")
  help.getColumn(1).width = 110
  ;[
    "How to fill in the Payments sheet",
    "",
    "• One row per payment received. Replace the example rows with real payments.",
    "• Required (red headers): Tracking No. (e.g. 2026-0001), Date Paid (YYYY-MM-DD) and Amount in pesos.",
    "• Method: Cash, GCash, Bank transfer or Other. Leave blank for Cash. Reference and Notes are optional.",
    "• Don't split a payment across months — the app applies each payment to the oldest unpaid month automatically.",
    "• A row with the same member, date and amount as a payment already in the app is skipped, so re-importing is safe.",
    `• Up to ${PAYMENT_IMPORT_MAX_ROWS.toLocaleString()} rows per file.`,
  ].forEach((line, i) => {
    const row = help.addRow([line])
    if (i === 0) row.font = { bold: true, size: 13 }
  })
  return Buffer.from(await workbook.xlsx.writeBuffer())
}
