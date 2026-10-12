import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { differenceInYears } from "date-fns"
import { ArrowLeft, CalendarCheck, Mail, MapPin, Phone, UserRound } from "lucide-react"

import { NoAccess } from "@/components/shared/no-access"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MemberContributionsCard } from "@/features/contributions/components/member-contributions-card"
import { MemberDetailActions } from "@/features/members/components/member-detail-actions"
import { isOfficer, positionLabel } from "@/features/members/positions"
import { getMember } from "@/features/members/queries"
import { memberAttendance } from "@/features/attendance/member-history"
import { cardUrl } from "@/lib/card-link"
import { formatDay, formatManila } from "@/lib/dates"
import { fullName } from "@/lib/names"
import { formatPhone } from "@/lib/phone"
import { can, requireViewer } from "@/lib/rbac"

export const metadata: Metadata = { title: "Member" }

const longDate = (d: Date) => formatManila(d, "MMMM d, yyyy")
// @db.Date values are midnight UTC; format them as plain calendar dates.
const calendarDate = (d: Date) => new Intl.DateTimeFormat("en-PH", { dateStyle: "long", timeZone: "UTC" }).format(d)

export default async function MemberPage({ params }: PageProps<"/members/[id]">) {
  const viewer = await requireViewer()
  if (!can(viewer, "member.view")) return <NoAccess what="members" />

  const { id } = await params
  const member = await getMember(id)
  if (!member) notFound()

  const name = fullName(member)
  const attendance = await memberAttendance(member.id, member.createdAt)
  const address = [member.addressLine, member.barangayName, member.cityName, member.provinceName, member.zipCode]
    .filter(Boolean)
    .join(", ")
  const age = member.birthDate ? differenceInYears(new Date(), member.birthDate) : null

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2 text-muted-foreground">
        <Link href="/members">
          <ArrowLeft /> Members
        </Link>
      </Button>

      <div className="grid gap-4 lg:grid-cols-12">
        {/* Profile */}
        <Card className="items-center px-5 text-center lg:col-span-4 lg:self-start">
          <div className="relative aspect-[3/4] w-40 overflow-hidden rounded-3xl bg-muted ring-1 ring-border">
            {member.photoUrl ? (
              <Image src={member.photoUrl} alt={name} fill unoptimized priority className="object-cover" />
            ) : (
              <div className="grid size-full place-items-center text-muted-foreground">
                <UserRound className="size-16" />
              </div>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">{name}</h1>
            <p className="mt-1 font-mono text-lg font-semibold text-accent-foreground dark:text-primary">
              {member.trackingNumber}
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 text-sm">
            <span
              className={
                isOfficer(member.position)
                  ? "rounded-full bg-ink px-3 py-1 font-semibold text-ink-foreground"
                  : "rounded-full bg-muted px-3 py-1 font-semibold"
              }
            >
              {positionLabel(member.position)}
            </span>
            <span className="rounded-full bg-accent px-3 py-1 font-semibold text-accent-foreground">
              Block {member.blockNumber} · Lot {member.lotNumber}
            </span>
            {member.isActive ? (
              <span className="rounded-full bg-success/15 px-3 py-1 font-semibold text-success">Active</span>
            ) : (
              <span className="rounded-full bg-muted px-3 py-1 font-semibold text-muted-foreground">Inactive</span>
            )}
          </div>
          <MemberDetailActions
            member={{ id: member.id, name, isActive: member.isActive }}
            hasPhoto={!!member.photoKey}
            idGeneratedAt={member.idGeneratedAt ? formatManila(member.idGeneratedAt) : null}
            publicUrl={member.cardToken ? cardUrl(member.cardToken) : null}
          />
        </Card>

        <div className="grid gap-4 lg:col-span-8">
          {!member.isActive && (
            <Card className="border border-dashed bg-muted/40 px-5 py-4 text-sm shadow-none">
              Deactivated{member.deletedAt ? ` on ${longDate(member.deletedAt)}` : ""}
              {member.deletedByName ? ` by ${member.deletedByName}` : ""}. The record is kept and can be restored.
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="font-semibold">Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                <Detail icon={Phone} label="Contact number" value={formatPhone(member.contactNumber)} />
                <Detail icon={Mail} label="Email" value={member.email} />
                <Detail
                  icon={UserRound}
                  label="Date of birth"
                  value={member.birthDate ? `${calendarDate(member.birthDate)} (${age} years old)` : null}
                />
                <Detail
                  icon={CalendarCheck}
                  label="Member since"
                  value={member.memberSince ? calendarDate(member.memberSince) : null}
                />
                <Detail
                  icon={MapPin}
                  label="Current address"
                  value={address ? `${address}${member.regionName ? ` · ${member.regionName}` : ""}` : null}
                  wide
                />
              </dl>
            </CardContent>
          </Card>

          {can(viewer, "contribution.view") && (
            <MemberContributionsCard
              member={{
                id: member.id,
                name,
                memberSince: member.memberSince,
                isActive: member.isActive,
                deletedAt: member.deletedAt,
              }}
              canCollect={can(viewer, "contribution.collect")}
              canVoid={can(viewer, "contribution.void")}
            />
          )}

          <Card>
            <CardHeader>
              <CardTitle className="font-semibold">Attendance</CardTitle>
              <CardDescription>Counted from meetings held since this member was added.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid grid-cols-3 gap-3">
                <MiniStat label="Attended" value={attendance.attended} />
                <MiniStat label="Meetings held" value={attendance.held} />
                <MiniStat label="Rate" value={attendance.rate === null ? "—" : `${attendance.rate}%`} />
              </div>
              {attendance.rows.length === 0 ? (
                <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                  No check-ins yet.
                </p>
              ) : (
                <ul className="divide-y rounded-xl border">
                  {attendance.rows.slice(0, 12).map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                      <Link href={`/meetings/${a.meeting.id}`} className="min-w-0 hover:underline">
                        <span className="block truncate font-medium">
                          {formatDay(a.meeting.date, "EEE, MMM d, yyyy")}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">{a.meeting.title}</span>
                      </Link>
                      <span className="shrink-0 text-right text-xs">
                        <span className="block font-semibold tabular-nums">
                          {formatManila(a.checkedInAt, "h:mm a")}
                        </span>
                        <span className="text-muted-foreground">{a.method === "QR" ? "QR" : "Manual"}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card size="sm" className="px-1">
            <CardContent className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
              <p>
                Added {formatManila(member.createdAt)} by{" "}
                <span className="font-medium text-foreground">{member.createdBy.name}</span>
              </p>
              <p className="sm:text-right">
                Last updated {formatManila(member.updatedAt)}
                {member.updatedBy && (
                  <>
                    {" "}
                    by <span className="font-medium text-foreground">{member.updatedBy.name}</span>
                  </>
                )}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}

function Detail({
  icon: Icon,
  label,
  value,
  wide,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | null | undefined
  wide?: boolean
}) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </dt>
      <dd className="mt-1 text-sm">{value || <span className="text-muted-foreground">Not provided</span>}</dd>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-muted/60 px-3 py-2.5">
      <p className="text-xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
