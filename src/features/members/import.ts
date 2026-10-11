import "server-only"

import { Readable } from "node:stream"

import ExcelJS from "exceljs"

import { MEMBER_POSITIONS, type MemberPositionValue } from "@/features/members/positions"
import { memberFieldsSchema, type MemberInput } from "@/features/members/schema"
import { db } from "@/lib/db"

export const IMPORT_MAX_ROWS = 1000

/** Template / export column headers the importer understands (case-insensitive; extra columns are ignored). */
export const IMPORT_COLUMNS = [
  { key: "trackingNumber", header: "Tracking No.", aliases: ["tracking number", "tracking"], required: true },
  { key: "lastName", header: "Last Name", aliases: ["surname"], required: true },
  { key: "firstName", header: "First Name", aliases: [], required: true },
  { key: "middleName", header: "Middle Name", aliases: [], required: false },
  { key: "suffix", header: "Suffix", aliases: [], required: false },
  { key: "position", header: "Position", aliases: [], required: false },
  { key: "blockNumber", header: "Block", aliases: ["block no.", "block number", "blk"], required: true },
  { key: "lotNumber", header: "Lot", aliases: ["lot no.", "lot number"], required: true },
  { key: "contactNumber", header: "Contact Number", aliases: ["contact", "mobile", "phone"], required: false },
  { key: "email", header: "Email", aliases: ["email address"], required: false },
  { key: "birthDate", header: "Date of Birth", aliases: ["birthdate", "birthday", "dob"], required: false },
  { key: "memberSince", header: "Member Since", aliases: [], required: false },
  { key: "addressLine", header: "House/Street", aliases: ["house/unit, street", "street", "address"], required: false },
  { key: "barangay", header: "Barangay", aliases: ["brgy"], required: false },
  { key: "city", header: "City/Municipality", aliases: ["city", "municipality"], required: false },
  { key: "province", header: "Province", aliases: [], required: false },
  { key: "zipCode", header: "ZIP", aliases: ["zip code", "postal code"], required: false },
] as const

type ColumnKey = (typeof IMPORT_COLUMNS)[number]["key"]
type RawRow = Partial<Record<ColumnKey, string>>

export type ImportRow = {
  row: number // spreadsheet row number
  status: "ok" | "error" | "duplicate"
  name: string
  trackingNumber: string
  errors: string[]
  warnings: string[]
  input?: MemberInput
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()

// ─── Reading the file ──────────────────────────────────────────────────────────

function cellText(value: ExcelJS.CellValue): string {
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

export async function readImportFile(file: File): Promise<{ rows: RawRow[]; firstRow: number } | { error: string }> {
  const buffer = Buffer.from(await file.arrayBuffer())
  const workbook = new ExcelJS.Workbook()
  try {
    if (/\.csv$/i.test(file.name) || file.type === "text/csv") {
      await workbook.csv.read(Readable.from(buffer.toString("utf8").replace(/^﻿/, "")))
    } else {
      await workbook.xlsx.load(buffer as unknown as ArrayBuffer)
    }
  } catch {
    return { error: "That file couldn't be read. Use the Excel template (.xlsx) or a CSV file." }
  }
  const sheet = workbook.getWorksheet("Members") ?? workbook.worksheets[0]
  if (!sheet) return { error: "The file has no sheets." }

  // Map header cells → our column keys.
  const header = sheet.getRow(1)
  const map = new Map<number, ColumnKey>()
  header.eachCell((cell, col) => {
    const h = norm(cellText(cell.value))
    const column = IMPORT_COLUMNS.find((c) => norm(c.header) === h || c.aliases.some((a) => norm(a) === h))
    if (column) map.set(col, column.key)
  })
  const missing = IMPORT_COLUMNS.filter((c) => c.required && ![...map.values()].includes(c.key))
  if (missing.length) {
    return { error: `Missing required column(s): ${missing.map((c) => c.header).join(", ")}. Use the template.` }
  }

  const rows: RawRow[] = []
  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r)
    const raw: RawRow = {}
    for (const [col, key] of map) raw[key] = cellText(row.getCell(col).value)
    if (Object.values(raw).every((v) => !v)) continue // skip blank lines
    ;(raw as RawRow & { _row?: number })._row = r
    rows.push(raw)
    if (rows.length > IMPORT_MAX_ROWS) return { error: `Import up to ${IMPORT_MAX_ROWS} rows at a time.` }
  }
  if (!rows.length) return { error: "No member rows were found under the header row." }
  return { rows, firstRow: 2 }
}

// ─── Value helpers ─────────────────────────────────────────────────────────────

function toPosition(value: string | undefined): MemberPositionValue | null {
  if (!value) return "MEMBER"
  const v = norm(value)
  const found = MEMBER_POSITIONS.find((p) => norm(p.label) === v || norm(p.value) === v)
  return found?.value ?? null
}

/** Accepts yyyy-mm-dd, m/d/yyyy or d-mm-yyyy-ish values; returns yyyy-mm-dd or "" (or null when unreadable). */
function toDay(value: string | undefined): string | null {
  if (!value) return ""
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const m = value.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/)
  if (m) return `${m[3]}-${m[1]!.padStart(2, "0")}-${m[2]!.padStart(2, "0")}` // month/day/year (PH/US style)
  return null
}

// ─── Address matching (PSGC names → codes), cached per import ──────────────────

const stripCity = (s: string) =>
  norm(s)
    .replace(/^city of /, "")
    .replace(/ city$/, "")
const stripBrgy = (s: string) => norm(s).replace(/^(barangay|brgy) /, "")

function addressResolver() {
  const cityCache = new Map<string, { code: string; regionCode: string; provinceCode: string | null } | null>()
  const brgyCache = new Map<string, { code: string; name: string }[]>()

  return async (city: string, province: string, barangay: string) => {
    const cityKey = `${stripCity(city)}|${norm(province)}`
    if (!cityCache.has(cityKey)) {
      const candidates = await db.psgcCity.findMany({
        where: {
          name: {
            contains: city
              .replace(/^city of /i, "")
              .replace(/ city$/i, "")
              .trim(),
            mode: "insensitive",
          },
        },
        select: { code: true, regionCode: true, provinceCode: true, name: true },
      })
      let matches = candidates.filter((c) => stripCity(c.name) === stripCity(city))
      if (matches.length > 1 && province) {
        const provinces = await db.psgcProvince.findMany({
          where: { code: { in: matches.map((m) => m.provinceCode).filter((c): c is string => !!c) } },
        })
        const wanted = provinces.find((p) => norm(p.name) === norm(province))
        matches = wanted ? matches.filter((m) => m.provinceCode === wanted.code) : matches
      }
      cityCache.set(cityKey, matches.length === 1 ? matches[0]! : null)
    }
    const cityHit = cityCache.get(cityKey)
    if (!cityHit) return null

    if (!brgyCache.has(cityHit.code)) {
      brgyCache.set(
        cityHit.code,
        await db.psgcBarangay.findMany({ where: { cityCode: cityHit.code }, select: { code: true, name: true } })
      )
    }
    const brgy = brgyCache.get(cityHit.code)!.find((b) => stripBrgy(b.name) === stripBrgy(barangay))
    if (!brgy) return null
    return {
      regionCode: cityHit.regionCode,
      provinceCode: cityHit.provinceCode ?? (cityHit.regionCode === "130000000" ? "" : "none"),
      cityCode: cityHit.code,
      barangayCode: brgy.code,
    }
  }
}

// ─── Validation ────────────────────────────────────────────────────────────────

export async function validateImportRows(rows: RawRow[]): Promise<ImportRow[]> {
  const resolve = addressResolver()
  const trackingNumbers = rows.map((r) => r.trackingNumber?.trim() ?? "").filter(Boolean)
  const existing = new Set(
    (
      await db.member.findMany({ where: { trackingNumber: { in: trackingNumbers } }, select: { trackingNumber: true } })
    ).map((m) => m.trackingNumber)
  )
  const seen = new Set<string>()
  const result: ImportRow[] = []

  for (const raw of rows) {
    const rowNumber = (raw as RawRow & { _row?: number })._row ?? 0
    const errors: string[] = []
    const warnings: string[] = []
    const tracking = raw.trackingNumber?.trim() ?? ""
    const name = [raw.firstName, raw.lastName].filter(Boolean).join(" ") || "(no name)"

    const position = toPosition(raw.position)
    if (!position) errors.push(`Unknown position "${raw.position}".`)
    const birthDate = toDay(raw.birthDate)
    if (birthDate === null) errors.push(`Date of birth "${raw.birthDate}" — use YYYY-MM-DD.`)
    const memberSince = toDay(raw.memberSince)
    if (memberSince === null) errors.push(`Member since "${raw.memberSince}" — use YYYY-MM-DD.`)

    // Address: matched to PSGC when barangay + city are given, otherwise kept as text.
    let codes = { regionCode: "", provinceCode: "", cityCode: "", barangayCode: "" }
    let addressLine = raw.addressLine ?? ""
    if (raw.city || raw.barangay) {
      const hit = raw.city && raw.barangay ? await resolve(raw.city, raw.province ?? "", raw.barangay) : null
      if (hit) codes = hit
      else {
        addressLine = [raw.addressLine, raw.barangay, raw.city, raw.province].filter(Boolean).join(", ")
        warnings.push("Address kept as text (barangay/city not matched) — set it when editing the member.")
      }
    }

    const input = {
      trackingNumber: tracking,
      firstName: raw.firstName ?? "",
      middleName: raw.middleName ?? "",
      lastName: raw.lastName ?? "",
      suffix: raw.suffix ?? "",
      position: position ?? "MEMBER",
      birthDate: birthDate ?? "",
      memberSince: memberSince ?? "",
      blockNumber: raw.blockNumber ?? "",
      lotNumber: raw.lotNumber ?? "",
      contactNumber: raw.contactNumber ?? "",
      email: raw.email ?? "",
      addressLine: addressLine.slice(0, 160),
      zipCode: raw.zipCode ?? "",
      ...codes,
    }
    const parsed = memberFieldsSchema.safeParse(input)
    if (!parsed.success) for (const issue of parsed.error.issues) errors.push(issue.message)

    let status: ImportRow["status"] = errors.length ? "error" : "ok"
    if (status === "ok" && (existing.has(tracking) || seen.has(tracking))) {
      status = "duplicate"
      errors.push(
        existing.has(tracking)
          ? `Tracking number ${tracking} already exists.`
          : `Tracking number ${tracking} appears twice in this file.`
      )
    }
    if (tracking) seen.add(tracking)

    result.push({
      row: rowNumber,
      status,
      name,
      trackingNumber: tracking,
      errors: [...new Set(errors)],
      warnings,
      input: status === "ok" && parsed.success ? parsed.data : undefined,
    })
  }
  return result
}

/** Builds the downloadable template (Members sheet + instructions). */
export async function importTemplate() {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = "Gintong Araw CDA"
  const sheet = workbook.addWorksheet("Members", { views: [{ state: "frozen", ySplit: 1 }] })
  sheet.columns = IMPORT_COLUMNS.map((c) => ({
    header: c.header,
    key: c.key,
    width: Math.max(12, c.header.length + 4),
  }))
  sheet.addRow({
    trackingNumber: "2026-0001",
    lastName: "Dela Cruz",
    firstName: "Juan",
    middleName: "Santos",
    suffix: "Jr.",
    position: "Member",
    blockNumber: "4",
    lotNumber: "12",
    contactNumber: "0917 123 4567",
    email: "",
    birthDate: "1980-05-14",
    memberSince: "2019-03-01",
    addressLine: "12 Sampaguita St.",
    barangay: "Bignay",
    city: "City of Valenzuela",
    province: "",
    zipCode: "1440",
  })
  const header = sheet.getRow(1)
  header.font = { bold: true }
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } }
  for (const col of IMPORT_COLUMNS.filter((c) => c.required)) {
    sheet.getCell(1, IMPORT_COLUMNS.indexOf(col) + 1).font = { bold: true, color: { argb: "FFB91C1C" } }
  }
  // Keep tracking numbers, dates and phone numbers as text so Excel doesn't reformat them.
  for (const key of [
    "trackingNumber",
    "contactNumber",
    "birthDate",
    "memberSince",
    "blockNumber",
    "lotNumber",
    "zipCode",
  ]) {
    sheet.getColumn(key).numFmt = "@"
  }

  const help = workbook.addWorksheet("Instructions")
  help.getColumn(1).width = 110
  ;[
    "How to fill in the Members sheet",
    "",
    "• One row per household. Replace the example row (row 2) with real members.",
    "• Required (red headers): Tracking No. (YYYY-NNNN, e.g. 2026-0001), Last Name, First Name, Block, Lot.",
    `• Position: ${MEMBER_POSITIONS.map((p) => p.label).join(", ")}. Leave blank for Member.`,
    "• Dates: YYYY-MM-DD (e.g. 1980-05-14). Contact number: PH mobile, e.g. 0917 123 4567.",
    "• Address: fill Barangay and City/Municipality to match the official list; otherwise it is kept as text.",
    "• Photos are not imported — add them per member afterwards (Edit → Upload or Take photo).",
    `• Up to ${IMPORT_MAX_ROWS} rows per file. Tracking numbers that already exist are skipped.`,
    "• A Members export (Excel) from this app can also be imported — extra columns are ignored.",
  ].forEach((line, i) => {
    const cell = help.getCell(i + 1, 1)
    cell.value = line
    if (i === 0) cell.font = { bold: true, size: 14 }
  })
  return Buffer.from(await workbook.xlsx.writeBuffer())
}
