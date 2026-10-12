"use server"

import { membersAtRisk } from "@/features/attendance/at-risk"
import { addMonths, formatMonth, formatPeso, rateFor } from "@/features/contributions/ledger"
import { activeMemberBalances, currentMonth, getContributionSchedule } from "@/features/contributions/queries"
import { getAppSettings } from "@/features/settings/queries"
import { dateToDay, dayToDate, formatDay, manilaToday } from "@/lib/dates"
import { db } from "@/lib/db"
import { can } from "@/lib/rbac"
import { actionClient } from "@/lib/safe-action"

export type Notice = {
  /** Stable per kind/subject; with `version`, decides whether the viewer has seen it. */
  id: string
  version: string
  tone: "danger" | "warning" | "info" | "success"
  icon: "user" | "shield" | "qr" | "calendar" | "alert" | "wallet" | "trend"
  title: string
  detail: string
  href: string
}

const DAY_MS = 86_400_000

/**
 * Alerts computed from current data (nothing is stored): each one stays until the situation is
 * resolved. Only what the viewer's permissions allow is included.
 */
export const getNotifications = actionClient
  .metadata({ name: "getNotifications" })
  .action(async ({ ctx: { viewer } }): Promise<Notice[]> => {
    const notices: Notice[] = []
    const today = manilaToday()
    const tasks: Promise<void>[] = []

    // Account security: failed sign-ins on this account in the last 7 days.
    tasks.push(
      (async () => {
        const failed = await db.auditLog.findMany({
          where: {
            action: "auth.login_failed",
            createdAt: { gte: new Date(Date.now() - 7 * DAY_MS) },
            metadata: { path: ["email"], equals: viewer.email.toLowerCase() },
          },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        })
        if (failed.length) {
          notices.push({
            id: "security.failed",
            version: failed[0]!.createdAt.toISOString(),
            tone: "danger",
            icon: "shield",
            title: `${failed.length} failed sign-in attempt${failed.length === 1 ? "" : "s"} on your account`,
            detail: "In the last 7 days. If this wasn't you, change your password.",
            href: "/change-password",
          })
        }
      })()
    )

    if (can(viewer, "user.approve")) {
      tasks.push(
        (async () => {
          const pending = await db.user.count({ where: { status: "PENDING" } })
          if (pending) {
            notices.push({
              id: "users.pending",
              version: String(pending),
              tone: "warning",
              icon: "user",
              title: `${pending} account${pending === 1 ? "" : "s"} awaiting approval`,
              detail: "Review and assign a group.",
              href: "/users?status=PENDING",
            })
          }
        })()
      )
    }

    if (can(viewer, "meeting.view")) {
      tasks.push(
        (async () => {
          const soon = dayToDate(dateToDay(new Date(Date.now() + 3 * DAY_MS)))
          const meetings = await db.meeting.findMany({
            where: { OR: [{ status: "OPEN" }, { status: "SCHEDULED", date: { lte: soon } }] },
            orderBy: { date: "asc" },
            take: 10,
            select: { id: true, title: true, date: true, status: true, _count: { select: { attendances: true } } },
          })
          for (const m of meetings) {
            const day = dateToDay(m.date)
            const label = `${m.title} · ${formatDay(m.date, "EEE, MMM d")}`
            if (m.status === "OPEN" && day < today && can(viewer, "meeting.manage")) {
              notices.push({
                id: `meeting.stale.${m.id}`,
                version: "1",
                tone: "warning",
                icon: "calendar",
                title: "A past meeting is still open",
                detail: `${label}. Close it so absences are counted.`,
                href: `/meetings/${m.id}`,
              })
            } else if (m.status === "OPEN" && day >= today && can(viewer, "attendance.capture")) {
              notices.push({
                id: `meeting.open.${m.id}`,
                version: "1",
                tone: "success",
                icon: "qr",
                title: "Meeting is open for check-in",
                detail: `${label} · ${m._count.attendances} checked in`,
                href: `/attendance/capture?meeting=${m.id}`,
              })
            } else if (m.status === "SCHEDULED" && day < today && can(viewer, "meeting.manage")) {
              notices.push({
                id: `meeting.missed.${m.id}`,
                version: "1",
                tone: "info",
                icon: "calendar",
                title: "A scheduled meeting was never opened",
                detail: `${label}. Open it to record attendance, or delete it.`,
                href: `/meetings/${m.id}`,
              })
            } else if (m.status === "SCHEDULED" && day === today) {
              notices.push({
                id: `meeting.today.${m.id}`,
                version: "1",
                tone: "info",
                icon: "calendar",
                title: "Meeting today",
                detail: can(viewer, "meeting.manage") ? `${label}. Open it to start check-ins.` : label,
                href: `/meetings/${m.id}`,
              })
            } else if (m.status === "SCHEDULED" && day > today) {
              notices.push({
                id: `meeting.soon.${m.id}`,
                version: "1",
                tone: "info",
                icon: "calendar",
                title: "Upcoming meeting",
                detail: label,
                href: `/meetings/${m.id}`,
              })
            }
          }
        })()
      )
    }

    if (can(viewer, "member.view")) {
      tasks.push(
        (async () => {
          const settings = await getAppSettings()
          const atRisk = await membersAtRisk(settings.atRiskThreshold)
          if (atRisk.length) {
            notices.push({
              id: "members.atRisk",
              version: String(atRisk.length),
              tone: "warning",
              icon: "alert",
              title: `${atRisk.length} member${atRisk.length === 1 ? "" : "s"} at risk`,
              detail: `Missed ${settings.atRiskThreshold} or more meetings in a row.`,
              href: "/members?risk=1",
            })
          }
        })()
      )
    }

    if (can(viewer, "contribution.view")) {
      tasks.push(
        (async () => {
          const month = currentMonth()
          const [balances, schedule] = await Promise.all([activeMemberBalances(), getContributionSchedule()])
          const overdue = balances.filter((b) => b.ledger.overdueMonths > 0)
          if (overdue.length) {
            const owed = overdue.reduce((sum, b) => sum + b.ledger.balance, 0)
            notices.push({
              id: "contributions.overdue",
              version: `${month}:${overdue.length}`,
              tone: "warning",
              icon: "wallet",
              title: `${overdue.length} household${overdue.length === 1 ? " has" : "s have"} overdue contributions`,
              detail: `${formatPeso(owed)} outstanding, including ${formatMonth(month)}.`,
              href: "/contributions",
            })
          }
          // A rate change starting within the next two months.
          for (const ahead of [1, 2]) {
            const next = addMonths(month, ahead)
            const before = rateFor(addMonths(next, -1), schedule.rates)
            const after = rateFor(next, schedule.rates)
            if (after !== before) {
              notices.push({
                id: `contributions.rate.${next}`,
                version: String(after),
                tone: "info",
                icon: "trend",
                title: `Monthly contribution becomes ${formatPeso(after)}`,
                detail: `Starting ${formatMonth(next, "long")} (currently ${formatPeso(before)}).`,
                href: can(viewer, "contribution.manage") ? "/settings#contributions" : "/contributions",
              })
              break
            }
          }
        })()
      )
    }

    await Promise.all(tasks)
    const order = { danger: 0, warning: 1, success: 2, info: 3 }
    return notices.sort((a, b) => order[a.tone] - order[b.tone])
  })
