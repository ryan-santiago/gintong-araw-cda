import type { Metadata } from "next"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Plus, Users } from "lucide-react"

import { NoAccess } from "@/components/shared/no-access"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { MemberAvatar } from "@/features/members/components/member-avatar"
import { MemberRowActions } from "@/features/members/components/member-row-actions"
import { MembersToolbar } from "@/features/members/components/members-toolbar"
import { isOfficer, positionLabel } from "@/features/members/positions"
import { listBlocks, listMembers, MEMBER_PAGE_SIZE, parseMemberFilters } from "@/features/members/queries"
import { membersAtRisk } from "@/features/attendance/at-risk"
import { getAppSettings } from "@/features/settings/queries"
import { fullName, memberInitials } from "@/lib/names"
import { formatPhone } from "@/lib/phone"
import { can, requireViewer } from "@/lib/rbac"

export const metadata: Metadata = { title: "Members" }

export default async function MembersPage({ searchParams }: PageProps<"/members">) {
  const viewer = await requireViewer()
  if (!can(viewer, "member.view")) return <NoAccess what="members" />

  const params = await searchParams
  const filters = parseMemberFilters(params)
  const settings = await getAppSettings()
  const atRisk = await membersAtRisk(settings.atRiskThreshold)
  const missedById = new Map(atRisk.map((m) => [m.id, m.missed]))
  const [{ total, members, counts }, blocks] = await Promise.all([
    listMembers(filters, filters.risk ? [...missedById.keys()] : undefined),
    listBlocks(),
  ])

  const pages = Math.max(1, Math.ceil(total / MEMBER_PAGE_SIZE))
  const pageHref = (page: number) => {
    const sp = new URLSearchParams()
    for (const [key, value] of Object.entries(params))
      if (typeof value === "string" && key !== "page") sp.set(key, value)
    if (page > 1) sp.set("page", String(page))
    const s = sp.toString()
    return s ? `/members?${s}` : "/members"
  }
  const first = total === 0 ? 0 : (filters.page - 1) * MEMBER_PAGE_SIZE + 1
  const last = Math.min(filters.page * MEMBER_PAGE_SIZE, total)
  const filtered = !!(filters.q || filters.block || filters.position || filters.risk)

  return (
    <>
      <PageHeader
        title="Members"
        description="One record per household. Search by name, tracking number or phone."
        actions={
          can(viewer, "member.create") && (
            <Button asChild size="lg">
              <Link href="/members/new">
                <Plus /> Add member
              </Link>
            </Button>
          )
        }
      />

      <MembersToolbar
        counts={{ ...counts, atRisk: atRisk.length }}
        blocks={blocks}
        canExport={can(viewer, "member.export")}
        canPrintIds={can(viewer, "member.generate_id")}
      />

      <Card className="gap-0 py-0">
        {members.length === 0 ? (
          <div className="grid justify-items-center gap-2 px-6 py-16 text-center">
            <Users className="size-8 text-muted-foreground" />
            <p className="font-semibold">{filtered ? "No members match your search" : "No members yet"}</p>
            <p className="text-sm text-muted-foreground">
              {filtered ? "Try a different name, number or block." : "Add the first household to get started."}
            </p>
            {!filtered && can(viewer, "member.create") && (
              <Button asChild className="mt-2">
                <Link href="/members/new">
                  <Plus /> Add member
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5">Member</TableHead>
                <TableHead className="hidden sm:table-cell">Tracking no.</TableHead>
                <TableHead className="hidden md:table-cell">Block / Lot</TableHead>
                <TableHead className="hidden lg:table-cell">Contact</TableHead>
                <TableHead className="hidden xl:table-cell">Barangay</TableHead>
                <TableHead className="w-12 pr-5">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => {
                const name = fullName(m)
                return (
                  <TableRow key={m.id} className="hover:bg-accent/60">
                    <TableCell className="w-full max-w-0 py-2.5 pl-5">
                      <Link href={`/members/${m.id}`} className="flex items-center gap-3 rounded-lg outline-none">
                        <MemberAvatar src={m.thumbUrl} initials={memberInitials(m)} seed={m.id} />
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">
                            {name}
                            {isOfficer(m.position) && (
                              <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-accent-foreground">
                                {positionLabel(m.position)}
                              </span>
                            )}
                            {missedById.has(m.id) && (
                              <span className="ml-2 rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-semibold text-warning">
                                Missed {missedById.get(m.id)}
                              </span>
                            )}
                            {!m.isActive && (
                              <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                                Inactive
                              </span>
                            )}
                          </span>
                          <span className="block truncate font-mono text-xs text-muted-foreground sm:hidden">
                            {m.trackingNumber} · Blk {m.blockNumber} Lot {m.lotNumber}
                          </span>
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="hidden font-mono text-[13px] sm:table-cell">{m.trackingNumber}</TableCell>
                    <TableCell className="hidden whitespace-nowrap md:table-cell">
                      Blk {m.blockNumber} · Lot {m.lotNumber}
                    </TableCell>
                    <TableCell className="hidden whitespace-nowrap text-muted-foreground tabular-nums lg:table-cell">
                      {formatPhone(m.contactNumber) || "—"}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground xl:table-cell">
                      {m.barangayName ?? "—"}
                    </TableCell>
                    <TableCell className="pr-5 text-right">
                      <MemberRowActions member={{ id: m.id, name, isActive: m.isActive }} />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
        <div className="flex items-center justify-between gap-3 border-t px-5 py-3 text-sm">
          <span className="text-muted-foreground tabular-nums">
            {first}–{last} of {total}
          </span>
          <div className="flex gap-2">
            <PageButton href={filters.page > 1 ? pageHref(filters.page - 1) : null}>
              <ChevronLeft /> Previous
            </PageButton>
            <PageButton href={filters.page < pages ? pageHref(filters.page + 1) : null}>
              Next <ChevronRight />
            </PageButton>
          </div>
        </div>
      </Card>
    </>
  )
}

function PageButton({ href, children }: { href: string | null; children: React.ReactNode }) {
  if (!href) {
    return (
      <Button variant="outline" size="sm" disabled>
        {children}
      </Button>
    )
  }
  return (
    <Button asChild variant="outline" size="sm">
      <Link href={href}>{children}</Link>
    </Button>
  )
}
