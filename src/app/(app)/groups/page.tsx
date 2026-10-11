import type { Metadata } from "next"
import Link from "next/link"
import { Lock, Plus, ShieldCheck, Users } from "lucide-react"

import { NoAccess } from "@/components/shared/no-access"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { DeleteGroupButton } from "@/features/groups/components/delete-group-button"
import { listGroups } from "@/features/groups/queries"
import { PERMISSION_KEYS } from "@/lib/permissions"
import { can, outranks, requireViewer } from "@/lib/rbac"

export const metadata: Metadata = { title: "Groups & Roles" }

export default async function GroupsPage() {
  const viewer = await requireViewer()
  if (!can(viewer, "group.view")) return <NoAccess what="groups" />

  const groups = await listGroups()
  const canManage = can(viewer, "group.manage")

  return (
    <>
      <PageHeader
        title="Groups & Roles"
        description="Each group has a rank (lower number = more authority) and a set of permissions."
        actions={
          canManage && (
            <Button asChild size="lg">
              <Link href="/groups/new">
                <Plus /> New group
              </Link>
            </Button>
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {groups.map((group) => {
          const editable = canManage && !group.isSystem && outranks(viewer, group.rank)
          const isAll = group.isSystem
          return (
            <Card key={group.id} className="gap-4 px-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-accent text-accent-foreground">
                    {group.isSystem ? <Lock className="size-5" /> : <ShieldCheck className="size-5" />}
                  </span>
                  <div>
                    <h2 className="font-bold">{group.name}</h2>
                    <p className="font-mono text-xs text-muted-foreground">rank {group.rank}</p>
                  </div>
                </div>
                {group.isSystem && (
                  <span className="rounded-full bg-ink px-2 py-0.5 text-[11px] font-semibold text-ink-foreground">
                    System
                  </span>
                )}
              </div>
              <p className="min-h-10 text-sm text-muted-foreground">{group.description || "No description."}</p>
              <div className="flex gap-4 text-sm">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="size-4 text-muted-foreground" />
                  <b className="tabular-nums">{group.memberCount}</b> user{group.memberCount === 1 ? "" : "s"}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="size-4 text-muted-foreground" />
                  <b className="tabular-nums">{isAll ? PERMISSION_KEYS.length : group.permissionCount}</b>
                  <span>/ {PERMISSION_KEYS.length} permissions</span>
                </span>
              </div>
              <div className="mt-auto flex gap-2 border-t pt-4">
                <Button asChild variant="outline" className="flex-1">
                  <Link href={`/groups/${group.id}`}>{editable ? "Edit" : "View"}</Link>
                </Button>
                {editable && <DeleteGroupButton id={group.id} name={group.name} memberCount={group.memberCount} />}
              </div>
            </Card>
          )
        })}
      </div>
    </>
  )
}
