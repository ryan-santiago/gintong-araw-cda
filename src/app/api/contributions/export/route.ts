import type { NextRequest } from "next/server"
import ExcelJS from "exceljs"

import { formatMonth, paymentMethodLabel } from "@/features/contributions/ledger"
import { activeMemberBalances, currentMonth } from "@/features/contributions/queries"
import { apiViewer } from "@/lib/api"
import { audit } from "@/lib/audit"
import { dateToDay, dayToDate, formatManila } from "@/lib/dates"
import { db } from "@/lib/db"

const DAY = /^\d{4}-\d{2}-\d{2}$/
const MAX_DAYS = 400

function csvCell(value: unknown) {
  const s = value == null ? "" : String(value)
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s
  return `"${safe.replace(/"/g, '""')}"`
}

/**
 * GET /api/contributions/export?from=yyyy-MM-dd&to=yyyy-MM-dd&format=xlsx|csv
 * xlsx: Payments (in range, voided included and marked) + Balances (every active member, as of today).
 * csv: the Payments sheet only.
 */
export async function GET(request: NextRequest) {
  const { viewer, error } = await apiViewer("contribution.export")
  if (error) return error

  const sp = request.nextUrl.searchParams
  const from = sp.get("from") ?? ""
  const to = sp.get("to") ?? ""
  const format = sp.get("format") === "csv" ? "csv" : "xlsx"
  if (!DAY.test(from) || !DAY.test(to) || from > to) {
    return Response.json({ error: "Choose a valid date range." }, { status: 400 })
  }
  if ((dayToDate(to).getTime() - dayToDate(from).getTime()) / 86_400_000 > MAX_DAYS) {
    return Response.json({ error: "Choose a range of about one year or less." }, { status: 400 })
  }

  const payments = await db.contributionPayment.findMany({
    where: { paidOn: { gte: dayToDate(from), lte: dayToDate(to) } },
    orderBy: [{ paidOn: "asc" }, { createdAt: "asc" }],
    include: {
      member: {
        select: {
          trackingNumber: true,
          firstName: true,
          middleName: true,
          lastName: true,
          blockNumber: true,
          lotNumber: true,
        },
      },
      recordedBy: { select: { name: true } },
      voidedBy: { select: { name: true } },
    },
  })

  const paymentRows = payments.map((p) => ({
    paidOn: dateToDay(p.paidOn),
    trackingNumber: p.member.trackingNumber,
    lastName: p.member.lastName,
    firstName: p.member.firstName,
    middleName: p.member.middleName ?? "",
    block: p.member.blockNumber,
    lot: p.member.lotNumber,
    amount: p.voidedAt ? 0 : p.amount / 100,
    originalAmount: p.amount / 100,
    method: paymentMethodLabel(p.method),
    reference: p.reference ?? "",
    source: p.source === "QR" ? "QR scan" : p.source === "IMPORT" ? "Imported" : "Manual",
    recordedBy: p.recordedBy.name,
    recordedAt: formatManila(p.createdAt, "yyyy-MM-dd h:mm a"),
    status: p.voidedAt ? "Voided" : "Valid",
    voidReason: p.voidedAt ? `${p.voidReason ?? ""} (by ${p.voidedBy?.name ?? "?"})` : "",
    notes: p.notes ?? "",
  }))

  await audit({
    actorId: viewer.id,
    action: "contribution.export",
    entityType: "ContributionPayment",
    metadata: { from, to, format, rows: paymentRows.length },
  })

  const filename = `gintong-araw-contributions_${from}_to_${to}.${format}`
  const headers = { "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "no-store" }

  const columns = [
    { header: "Date Paid", key: "paidOn", width: 12 },
    { header: "Tracking No.", key: "trackingNumber", width: 13 },
    { header: "Last Name", key: "lastName", width: 18 },
    { header: "First Name", key: "firstName", width: 18 },
    { header: "Middle Name", key: "middleName", width: 15 },
    { header: "Block", key: "block", width: 7 },
    { header: "Lot", key: "lot", width: 7 },
    { header: "Amount", key: "amount", width: 12 },
    { header: "Amount Recorded", key: "originalAmount", width: 16 },
    { header: "Method", key: "method", width: 13 },
    { header: "Reference", key: "reference", width: 16 },
    { header: "Source", key: "source", width: 10 },
    { header: "Recorded By", key: "recordedBy", width: 20 },
    { header: "Recorded At", key: "recordedAt", width: 19 },
    { header: "Status", key: "status", width: 9 },
    { header: "Void Reason", key: "voidReason", width: 28 },
    { header: "Notes", key: "notes", width: 28 },
  ] as const

  if (format === "csv") {
    const lines = [
      columns.map((c) => csvCell(c.header)).join(","),
      ...paymentRows.map((r) => columns.map((c) => csvCell(r[c.key])).join(",")),
    ]
    return new Response("﻿" + lines.join("\r\n"), {
      headers: { ...headers, "Content-Type": "text/csv; charset=utf-8" },
    })
  }

  const workbook = new ExcelJS.Workbook()
  workbook.creator = "Gintong Araw CDA"
  const styleHeader = (sheet: ExcelJS.Worksheet, cols: number) => {
    const header = sheet.getRow(1)
    header.font = { bold: true }
    header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } }
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cols } }
  }
  const peso = '"₱"#,##0.00'

  const s1 = workbook.addWorksheet("Payments", { views: [{ state: "frozen", ySplit: 1 }] })
  s1.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width }))
  s1.addRows(paymentRows)
  s1.getColumn("amount").numFmt = peso
  s1.getColumn("originalAmount").numFmt = peso
  styleHeader(s1, columns.length)
  if (paymentRows.length) {
    const total = s1.addRow({ paidOn: "Total", amount: { formula: `SUM(H2:H${paymentRows.length + 1})` } })
    total.font = { bold: true }
  }

  const month = currentMonth()
  const balances = await activeMemberBalances()
  const s2 = workbook.addWorksheet("Balances", { views: [{ state: "frozen", ySplit: 1 }] })
  s2.columns = [
    { header: "Tracking No.", key: "trackingNumber", width: 13 },
    { header: "Name", key: "name", width: 28 },
    { header: "Block", key: "block", width: 7 },
    { header: "Lot", key: "lot", width: 7 },
    { header: "Owing Since", key: "start", width: 12 },
    { header: "Total Due", key: "due", width: 12 },
    { header: "Total Paid", key: "paid", width: 12 },
    { header: "Balance", key: "balance", width: 12 },
    { header: "Advance Credit", key: "credit", width: 14 },
    { header: "Paid Through", key: "paidThrough", width: 13 },
    { header: "Overdue Months", key: "overdue", width: 15 },
  ]
  s2.addRows(
    balances
      .sort(
        (a, b) =>
          a.blockNumber.localeCompare(b.blockNumber, undefined, { numeric: true }) || a.name.localeCompare(b.name)
      )
      .map((b) => ({
        trackingNumber: b.trackingNumber,
        name: b.name,
        block: b.blockNumber,
        lot: b.lotNumber,
        start: formatMonth(b.ledger.startMonth),
        due: b.ledger.totalDue / 100,
        paid: b.ledger.totalPaid / 100,
        balance: b.ledger.balance / 100,
        credit: b.ledger.credit / 100,
        paidThrough: b.ledger.paidThrough ? formatMonth(b.ledger.paidThrough) : "",
        overdue: b.ledger.overdueMonths,
      }))
  )
  for (const key of ["due", "paid", "balance", "credit"]) s2.getColumn(key).numFmt = peso
  styleHeader(s2, 11)
  s2.addRow([])
  s2.addRow([`Balances as of ${formatMonth(month, "long")} (active members only).`]).font = { italic: true }

  const buffer = await workbook.xlsx.writeBuffer()
  return new Response(buffer, {
    headers: { ...headers, "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
  })
}
