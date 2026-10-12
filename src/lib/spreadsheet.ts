import "server-only"

import { Readable } from "node:stream"

import ExcelJS from "exceljs"

// Shared helpers for the Excel/CSV importers (members, contributions).

export type SheetColumn = { key: string; header: string; aliases: readonly string[]; required: boolean }

type KeyOf<C extends readonly SheetColumn[]> = C[number]["key"]
export type SheetRow<C extends readonly SheetColumn[]> = Partial<Record<KeyOf<C>, string>> & { _row: number }

/** Lowercase, accent-free, punctuation collapsed — for matching headers and names. */
export const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()

export function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return ""
  if (value instanceof Date) return value.toISOString().slice(0, 10) // Excel dates come back as UTC midnight
  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") return value.text.trim()
    if ("richText" in value)
      return value.richText
        .map((r) => r.text)
        .join("")
        .trim()
    if ("result" in value && value.result != null) return cellText(value.result as ExcelJS.CellValue)
    return ""
  }
  return String(value).trim()
}

/**
 * Reads the first matching sheet of an .xlsx or .csv upload into rows keyed by column.
 * Headers are matched case-insensitively (with aliases); unknown columns and blank lines are ignored.
 */
export async function readSheet<const C extends readonly SheetColumn[]>(
  file: File,
  columns: C,
  options: { sheetName: string; maxRows: number; noun: string }
): Promise<{ rows: SheetRow<C>[] } | { error: string }> {
  const buffer = Buffer.from(await file.arrayBuffer())
  const workbook = new ExcelJS.Workbook()
  try {
    if (/\.csv$/i.test(file.name) || file.type === "text/csv") {
      // Keep CSV cells as text: exceljs's default parsing turns "2026-01-10" into a *local*-time Date,
      // which shifts the day back when read as UTC (Manila is UTC+8).
      await workbook.csv.read(Readable.from(buffer.toString("utf8").replace(/^﻿/, "")), {
        map: (value: unknown) => value,
      })
    } else {
      await workbook.xlsx.load(buffer as unknown as ArrayBuffer)
    }
  } catch {
    return { error: "That file couldn't be read. Use the Excel template (.xlsx) or a CSV file." }
  }
  const sheet = workbook.getWorksheet(options.sheetName) ?? workbook.worksheets[0]
  if (!sheet) return { error: "The file has no sheets." }

  const map = new Map<number, KeyOf<C>>()
  sheet.getRow(1).eachCell((cell, col) => {
    const h = norm(cellText(cell.value))
    const column = columns.find((c) => norm(c.header) === h || c.aliases.some((a) => norm(a) === h))
    if (column) map.set(col, column.key as KeyOf<C>)
  })
  const missing = columns.filter((c) => c.required && ![...map.values()].includes(c.key as KeyOf<C>))
  if (missing.length) {
    return { error: `Missing required column(s): ${missing.map((c) => c.header).join(", ")}. Use the template.` }
  }

  const rows: SheetRow<C>[] = []
  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r)
    const raw = {} as Partial<Record<KeyOf<C>, string>>
    for (const [col, key] of map) raw[key] = cellText(row.getCell(col).value)
    if (Object.values(raw).every((v) => !v)) continue // skip blank lines
    rows.push({ ...raw, _row: r })
    if (rows.length > options.maxRows) return { error: `Import up to ${options.maxRows} rows at a time.` }
  }
  if (!rows.length) return { error: `No ${options.noun} rows were found under the header row.` }
  return { rows }
}

/** Accepts yyyy-mm-dd or m/d/yyyy; returns yyyy-mm-dd, "" when blank, or null when unreadable. */
export function toDay(value: string | undefined): string | null {
  if (!value) return ""
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const m = value.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/)
  if (m) return `${m[3]}-${m[1]!.padStart(2, "0")}-${m[2]!.padStart(2, "0")}` // month/day/year (PH/US style)
  return null
}

/** Template sheet with bold header, required headers in red and the given columns stored as text. */
export function templateSheet(
  workbook: ExcelJS.Workbook,
  name: string,
  columns: readonly SheetColumn[],
  textColumns: readonly string[]
) {
  const sheet = workbook.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] })
  sheet.columns = columns.map((c) => ({ header: c.header, key: c.key, width: Math.max(12, c.header.length + 4) }))
  const header = sheet.getRow(1)
  header.font = { bold: true }
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } }
  columns.forEach((c, i) => {
    if (c.required) sheet.getCell(1, i + 1).font = { bold: true, color: { argb: "FFB91C1C" } }
  })
  // Keep codes, dates and phone numbers as text so Excel doesn't reformat them.
  for (const key of textColumns) sheet.getColumn(key).numFmt = "@"
  return sheet
}
