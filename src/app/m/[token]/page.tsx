import { Suspense } from "react"
import type { Metadata } from "next"
import Image from "next/image"
import { BadgeCheck, CalendarCheck, CircleAlert, MapPin, UserRound } from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import { publicMemberByToken } from "@/features/public-card/queries"
import { formatDay, formatManila } from "@/lib/dates"

// Reached by scanning a member's ID card. No login; never indexed by search engines.
export const metadata: Metadata = {
  title: "Member card",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
}

export default function PublicMemberPage({ params }: PageProps<"/m/[token]">) {
  return (
    <main className="min-h-svh bg-background px-4 py-6 sm:py-10">
      <div className="mx-auto grid max-w-md gap-4">
        <header className="flex items-center gap-3">
          <Image src="/brand/logo.png" alt="" width={44} height={41} className="size-11 object-contain" priority />
          <div className="leading-tight">
            <p className="font-extrabold">Gintong Araw</p>
            <p className="text-xs text-muted-foreground">Community Development Association, Inc.</p>
          </div>
        </header>
        <Suspense fallback={<Skeleton className="h-[520px] rounded-3xl" />}>
          <MemberCard params={params} />
        </Suspense>
        <p className="px-2 text-center text-xs text-muted-foreground">
          This page is for the member named on the card. If you found this ID, please return it to the HOA office.
        </p>
      </div>
    </main>
  )
}

async function MemberCard({ params }: { params: PageProps<"/m/[token]">["params"] }) {
  const { token } = await params
  const member = await publicMemberByToken(token)

  if (!member || !member.active) {
    return (
      <div className="grid justify-items-center gap-3 rounded-3xl bg-card p-8 text-center shadow-card">
        <span className="grid size-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
          <CircleAlert className="size-6" />
        </span>
        <h1 className="text-lg font-bold">{member ? "This card is no longer active" : "Card not recognized"}</h1>
        <p className="text-sm text-muted-foreground">
          {member
            ? "Please contact the HOA office for assistance."
            : "This ID may have been replaced with a new card. Please contact the HOA office."}
        </p>
      </div>
    )
  }

  return (
    <>
      <section className="overflow-hidden rounded-3xl bg-card shadow-card">
        <div className="relative h-28 bg-gradient-gold">
          <div
            aria-hidden
            className="absolute -top-16 -right-10 size-48 rounded-full bg-[radial-gradient(circle,rgb(255_255_255/0.6),transparent_65%)]"
          />
        </div>
        <div className="-mt-20 grid justify-items-center gap-3 px-6 pb-6 text-center">
          <div className="relative aspect-[3/4] w-36 overflow-hidden rounded-2xl bg-muted shadow-lg ring-4 ring-card">
            {member.photoUrl ? (
              <Image src={member.photoUrl} alt={member.name} fill unoptimized priority className="object-cover" />
            ) : (
              <UserRound className="m-auto mt-12 size-12 text-muted-foreground" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">{member.name}</h1>
            <p className="font-semibold text-accent-foreground dark:text-primary">{member.position}</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1 text-sm font-semibold text-success">
            <BadgeCheck className="size-4" /> Active member
          </span>
          <dl className="mt-1 grid w-full grid-cols-2 gap-3 text-left">
            <div className="rounded-2xl bg-muted/60 px-4 py-3">
              <dt className="text-xs text-muted-foreground">Tracking no.</dt>
              <dd className="font-mono text-lg font-bold">{member.trackingNumber}</dd>
            </div>
            <div className="rounded-2xl bg-muted/60 px-4 py-3">
              <dt className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="size-3" /> Block / Lot
              </dt>
              <dd className="text-lg font-bold">{member.blockLot.replace("Block ", "Blk ")}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="rounded-3xl bg-card p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-bold">
            <CalendarCheck className="size-5 text-secondary" /> Attendance
          </h2>
          <span className="rounded-full bg-accent px-3 py-1 text-sm font-semibold text-accent-foreground">
            {member.attended} meeting{member.attended === 1 ? "" : "s"}
          </span>
        </div>
        {member.attendance.length === 0 ? (
          <p className="rounded-2xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            No attendance recorded yet.
          </p>
        ) : (
          <ul className="divide-y">
            {member.attendance.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-2.5 text-sm">
                <span className="font-medium">{formatDay(a.date, "EEEE, MMMM d, yyyy")}</span>
                <span className="text-muted-foreground tabular-nums">{formatManila(a.checkedInAt, "h:mm a")}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
