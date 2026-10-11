"use client"

import { useState } from "react"
import Link from "next/link"
import { Eye, MoreHorizontal, Pencil, RotateCcw, UserX } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useCan } from "@/components/viewer-provider"
import { MemberStatusDialog } from "@/features/members/components/member-status-dialog"

export function MemberRowActions({ member }: { member: { id: string; name: string; isActive: boolean } }) {
  const can = useCan()
  const [dialog, setDialog] = useState<"deactivate" | "restore" | null>(null)
  const canToggle = member.isActive ? can("member.deactivate") : can("member.restore")

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Actions for ${member.name}`}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem asChild>
            <Link href={`/members/${member.id}`}>
              <Eye /> View
            </Link>
          </DropdownMenuItem>
          {can("member.update") && (
            <DropdownMenuItem asChild>
              <Link href={`/members/${member.id}/edit`}>
                <Pencil /> Edit
              </Link>
            </DropdownMenuItem>
          )}
          {canToggle && (
            <>
              <DropdownMenuSeparator />
              {member.isActive ? (
                <DropdownMenuItem variant="destructive" onSelect={() => setDialog("deactivate")}>
                  <UserX /> Deactivate
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onSelect={() => setDialog("restore")}>
                  <RotateCcw /> Restore
                </DropdownMenuItem>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {dialog && <MemberStatusDialog member={member} mode={dialog} onClose={() => setDialog(null)} />}
    </>
  )
}
