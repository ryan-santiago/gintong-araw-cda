import type { Metadata } from "next"

import { NoAccess } from "@/components/shared/no-access"
import { CollectScreen } from "@/features/contributions/components/collect-screen"
import { collectStatus } from "@/features/contributions/queries"
import { manilaToday } from "@/lib/dates"
import { can, requireViewer } from "@/lib/rbac"

export const metadata: Metadata = { title: "Collect contributions" }

export default async function CollectPage({ searchParams }: PageProps<"/contributions/collect">) {
  const viewer = await requireViewer()
  if (!can(viewer, "contribution.collect")) return <NoAccess what="recording contributions" />

  const { member } = await searchParams
  return (
    <CollectScreen
      initialStatus={await collectStatus(viewer.id)}
      today={manilaToday()}
      initialMemberId={typeof member === "string" ? member : undefined}
    />
  )
}
