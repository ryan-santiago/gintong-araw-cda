"use client"

import { useState } from "react"
import Link from "next/link"
import { Pencil, RotateCcw, UserX } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useCan } from "@/components/viewer-provider"
import { IdCardDialog } from "@/features/id-card/components/id-card-dialog"
import { MemberStatusDialog } from "@/features/members/components/member-status-dialog"

export function MemberDetailActions({
  member,
  hasPhoto,
  idGeneratedAt,
  publicUrl,
}: {
  member: { id: string; name: string; isActive: boolean }
  hasPhoto: boolean
  idGeneratedAt: string | null
  publicUrl: string | null
}) {
  const can = useCan()
  const [dialog, setDialog] = useState<"deactivate" | "restore" | null>(null)

  return (
    <div className="flex flex-wrap gap-2">
      {can("member.update") && (
        <Button asChild>
          <Link href={`/members/${member.id}/edit`}>
            <Pencil /> Edit
          </Link>
        </Button>
      )}
      {can("member.generate_id") && (
        <IdCardDialog
          member={member}
          lastGenerated={idGeneratedAt}
          publicUrl={publicUrl}
          blockedReason={
            !member.isActive
              ? "Restore this member before issuing an ID."
              : !hasPhoto
                ? "Add a photo first (Edit → Upload or Take photo)."
                : null
          }
        />
      )}
      {member.isActive && can("member.deactivate") && (
        <Button variant="destructive" onClick={() => setDialog("deactivate")}>
          <UserX /> Deactivate
        </Button>
      )}
      {!member.isActive && can("member.restore") && (
        <Button variant="outline" onClick={() => setDialog("restore")}>
          <RotateCcw /> Restore
        </Button>
      )}
      {dialog && <MemberStatusDialog member={member} mode={dialog} onClose={() => setDialog(null)} />}
    </div>
  )
}
