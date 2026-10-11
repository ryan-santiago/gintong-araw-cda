import type { NextRequest } from "next/server"
import ExcelJS from "exceljs"

import { positionLabel } from "@/features/members/positions"
import { memberWhere, parseMemberFilters } from "@/features/members/queries"
import { apiViewer } from "@/lib/api"
import { audit } from "@/lib/audit"
import { db } from "@/lib/db"
import { formatManila } from "@/lib/dates"
import { formatPhone } from "@/lib/phone"

const COLUMNS = [
  { header: "Tracking No.", key: "trackingNumber", width: 14 },
  { header: "Last Name", key: "lastName", width: 18 },
  { header: "First Name", key: "firstName", width: 18 },
  { header: "Middle Name", key: "middleName", width: 16 },
  { header: "Suffix", key: "suffix", width: 8 },
  { header: "Position", key: "position", width: 18 },
  { header: "Block", key: "blockNumber", width: 8 },
  { header: "Lot", key: "lotNumber", width: 8 },
  { header: "Contact Number", key: "contactNumber", width: 16 },
  { header: "Email", key: "email", width: 26 },
  { header: "Date of Birth", key: "birthDate", width: 13 },
  { header: "Member Since", key: "memberSince", width: 13 },
  { header: "House/Street", key: "addressLine", width: 28 },
  { header: "Barangay", key: "barangayName", width: 20 },
  { header: "City/Municipality", key: "cityName", width: 22 },
  { header: "Province", key: "provinceName", width: 18 },
  { header: "Region", key: "regionName", width: 24 },
  { header: "ZIP", key: "zipCode", width: 7 },
  { header: "Status", key: "status", width: 10 },
  { header: "Created", key: "createdAt", width: 20 },
] as const

function csvCell(value: unknown) {
  const s = value == null ? "" : String(value)
  // Prevent spreadsheet formula injection, then quote.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s
  return `"${safe.replace(/"/g, '""')}"`
}

/** GET /api/members/export?format=xlsx|csv plus the list filters (q, status, block, sort). */
export async function GET(request: NextRequest) {
  const { viewer, error } = await apiViewer("member.export")
  if (error) return error

  const params = Object.fromEntries(request.nextUrl.searchParams)
  const filters = parseMemberFilters(params)
  const format = params.format === "csv" ? "csv" : "xlsx"

  const members = await db.member.findMany({
    where: memberWhere(filters),
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  })

  const rows = members.map((m) => ({
    trackingNumber: m.trackingNumber,
    lastName: m.lastName,
    firstName: m.firstName,
    middleName: m.middleName ?? "",
    suffix: m.suffix ?? "",
    position: positionLabel(m.position),
    blockNumber: m.blockNumber,
    lotNumber: m.lotNumber,
    contactNumber: formatPhone(m.contactNumber),
    email: m.email ?? "",
    birthDate: m.birthDate ? m.birthDate.toISOString().slice(0, 10) : "",
    memberSince: m.memberSince ? m.memberSince.toISOString().slice(0, 10) : "",
    addressLine: m.addressLine ?? "",
    barangayName: m.barangayName ?? "",
    cityName: m.cityName ?? "",
    provinceName: m.provinceName ?? "",
    regionName: m.regionName ?? "",
    zipCode: m.zipCode ?? "",
    status: m.isActive ? "Active" : "Inactive",
    createdAt: formatManila(m.createdAt, "yyyy-MM-dd HH:mm"),
  }))

  await audit({
    actorId: viewer.id,
    action: "member.export",
    entityType: "Member",
    metadata: {
      format,
      count: rows.length,
      filters: { q: filters.q, status: filters.status, block: filters.block, position: filters.position },
    },
  })

  const stamp = formatManila(new Date(), "yyyyMMdd-HHmm")
  const filename = `gintong-araw-members-${stamp}.${format}`
  const headers = {
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "no-store",
  }

  if (format === "csv") {
    const lines = [
      COLUMNS.map((c) => csvCell(c.header)).join(","),
      ...rows.map((r) => COLUMNS.map((c) => csvCell(r[c.key])).join(",")),
    ]
    // BOM so Excel opens UTF-8 names (ñ) correctly.
    return new Response("﻿" + lines.join("\r\n"), {
      headers: { ...headers, "Content-Type": "text/csv; charset=utf-8" },
    })
  }

  const workbook = new ExcelJS.Workbook()
  workbook.creator = "Gintong Araw CDA"
  const sheet = workbook.addWorksheet("Members", { views: [{ state: "frozen", ySplit: 1 }] })
  sheet.columns = COLUMNS.map((c) => ({ header: c.header, key: c.key, width: c.width }))
  sheet.addRows(rows)
  const header = sheet.getRow(1)
  header.font = { bold: true }
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } }
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLUMNS.length } }

  const buffer = await workbook.xlsx.writeBuffer()
  return new Response(buffer, {
    headers: { ...headers, "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
  })
}
