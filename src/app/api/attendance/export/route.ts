import type { NextRequest } from "next/server"
import ExcelJS from "exceljs"

import { positionLabel } from "@/features/members/positions"
import { apiViewer } from "@/lib/api"
import { audit } from "@/lib/audit"
import { dateToDay, dayToDate, formatManila } from "@/lib/dates"
import { db } from "@/lib/db"
import { fullName } from "@/lib/names"

const DAY = /^\d{4}-\d{2}-\d{2}$/
const MAX_DAYS = 366

function csvCell(value: unknown) {
  const s = value == null ? "" : String(value)
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s
  return `"${safe.replace(/"/g, '""')}"`
}

/**
 * GET /api/attendance/export?from=yyyy-MM-dd&to=yyyy-MM-dd&format=xlsx|csv
 * xlsx: Attendance + Summary + Meetings sheets. csv: the Attendance sheet only.
 */
export async function GET(request: NextRequest) {
  const { viewer, error } = await apiViewer("attendance.export")
  if (error) return error

  const sp = request.nextUrl.searchParams
  const from = sp.get("from") ?? ""
  const to = sp.get("to") ?? ""
  const format = sp.get("format") === "csv" ? "csv" : "xlsx"
  if (!DAY.test(from) || !DAY.test(to) || from > to) {
    return Response.json({ error: "Choose a valid date range." }, { status: 400 })
  }
  if ((dayToDate(to).getTime() - dayToDate(from).getTime()) / 86_400_000 > MAX_DAYS) {
    return Response.json({ error: "Choose a range of one year or less." }, { status: 400 })
  }

  const meetings = await db.meeting.findMany({
    where: { date: { gte: dayToDate(from), lte: dayToDate(to) } },
    orderBy: { date: "asc" },
    include: {
      attendances: {
        orderBy: { checkedInAt: "asc" },
        include: {
          member: {
            select: {
              id: true,
              trackingNumber: true,
              firstName: true,
              middleName: true,
              lastName: true,
              suffix: true,
              blockNumber: true,
              lotNumber: true,
              position: true,
            },
          },
          recordedBy: { select: { name: true } },
        },
      },
    },
  })

  const attendanceRows = meetings.flatMap((m) =>
    m.attendances.map((a) => ({
      meetingDate: dateToDay(m.date),
      meeting: m.title,
      trackingNumber: a.member.trackingNumber,
      lastName: a.member.lastName,
      firstName: a.member.firstName,
      middleName: a.member.middleName ?? "",
      block: a.member.blockNumber,
      lot: a.member.lotNumber,
      position: positionLabel(a.member.position),
      timeIn: formatManila(a.checkedInAt, "h:mm a"),
      method: a.method === "QR" ? "QR" : "Manual",
      recordedBy: a.recordedBy.name,
    }))
  )

  await audit({
    actorId: viewer.id,
    action: "attendance.export",
    entityType: "Attendance",
    metadata: { from, to, format, meetings: meetings.length, rows: attendanceRows.length },
  })

  const filename = `gintong-araw-attendance_${from}_to_${to}.${format}`
  const headers = { "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "no-store" }

  const attendanceColumns = [
    { header: "Meeting Date", key: "meetingDate", width: 13 },
    { header: "Meeting", key: "meeting", width: 22 },
    { header: "Tracking No.", key: "trackingNumber", width: 13 },
    { header: "Last Name", key: "lastName", width: 18 },
    { header: "First Name", key: "firstName", width: 18 },
    { header: "Middle Name", key: "middleName", width: 15 },
    { header: "Block", key: "block", width: 7 },
    { header: "Lot", key: "lot", width: 7 },
    { header: "Position", key: "position", width: 17 },
    { header: "Time In", key: "timeIn", width: 10 },
    { header: "Method", key: "method", width: 9 },
    { header: "Recorded By", key: "recordedBy", width: 20 },
  ] as const

  if (format === "csv") {
    const lines = [
      attendanceColumns.map((c) => csvCell(c.header)).join(","),
      ...attendanceRows.map((r) => attendanceColumns.map((c) => csvCell(r[c.key])).join(",")),
    ]
    return new Response("﻿" + lines.join("\r\n"), {
      headers: { ...headers, "Content-Type": "text/csv; charset=utf-8" },
    })
  }

  // Summary: active members + anyone who attended in the range. A member only counts meetings
  // held (opened) on or after the day they were added, so new members aren't marked absent.
  const held = meetings.filter((m) => m.status !== "SCHEDULED")
  const attendedBy = new Map<string, number>()
  for (const m of meetings)
    for (const a of m.attendances) attendedBy.set(a.memberId, (attendedBy.get(a.memberId) ?? 0) + 1)
  const members = await db.member.findMany({
    where: { OR: [{ isActive: true }, { id: { in: [...attendedBy.keys()] } }] },
    orderBy: [{ blockNumber: "asc" }, { lotNumber: "asc" }, { lastName: "asc" }],
  })
  const summaryRows = members.map((m) => {
    const joined = dateToDay(m.createdAt)
    const eligible = held.filter((h) => dateToDay(h.date) >= joined).length
    const attended = attendedBy.get(m.id) ?? 0
    const base = Math.max(eligible, attended)
    return {
      trackingNumber: m.trackingNumber,
      name: fullName(m),
      block: m.blockNumber,
      lot: m.lotNumber,
      position: positionLabel(m.position),
      status: m.isActive ? "Active" : "Inactive",
      held: base,
      attended,
      absent: base - attended,
      rate: base ? attended / base : null,
    }
  })

  const workbook = new ExcelJS.Workbook()
  workbook.creator = "Gintong Araw CDA"
  const styleHeader = (sheet: ExcelJS.Worksheet, cols: number) => {
    const header = sheet.getRow(1)
    header.font = { bold: true }
    header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } }
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cols } }
  }

  const s1 = workbook.addWorksheet("Attendance", { views: [{ state: "frozen", ySplit: 1 }] })
  s1.columns = attendanceColumns.map((c) => ({ header: c.header, key: c.key, width: c.width }))
  s1.addRows(attendanceRows)
  styleHeader(s1, attendanceColumns.length)

  const s2 = workbook.addWorksheet("Summary", { views: [{ state: "frozen", ySplit: 1 }] })
  s2.columns = [
    { header: "Tracking No.", key: "trackingNumber", width: 13 },
    { header: "Name", key: "name", width: 28 },
    { header: "Block", key: "block", width: 7 },
    { header: "Lot", key: "lot", width: 7 },
    { header: "Position", key: "position", width: 17 },
    { header: "Status", key: "status", width: 9 },
    { header: "Meetings Held", key: "held", width: 14 },
    { header: "Attended", key: "attended", width: 10 },
    { header: "Absent", key: "absent", width: 9 },
    { header: "Attendance Rate", key: "rate", width: 15 },
  ]
  s2.addRows(summaryRows)
  s2.getColumn("rate").numFmt = "0%"
  styleHeader(s2, 10)

  const s3 = workbook.addWorksheet("Meetings", { views: [{ state: "frozen", ySplit: 1 }] })
  s3.columns = [
    { header: "Date", key: "date", width: 13 },
    { header: "Meeting", key: "title", width: 24 },
    { header: "Location", key: "location", width: 22 },
    { header: "Status", key: "status", width: 11 },
    { header: "Present", key: "present", width: 9 },
  ]
  s3.addRows(
    meetings.map((m) => ({
      date: dateToDay(m.date),
      title: m.title,
      location: m.location ?? "",
      status: m.status === "OPEN" ? "Open" : m.status === "CLOSED" ? "Closed" : "Scheduled",
      present: m.attendances.length,
    }))
  )
  styleHeader(s3, 5)

  const buffer = await workbook.xlsx.writeBuffer()
  return new Response(buffer, {
    headers: { ...headers, "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
  })
}
