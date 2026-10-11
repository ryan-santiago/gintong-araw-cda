"use client"

import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useAction } from "next-safe-action/hooks"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { deactivateMember, restoreMember } from "@/features/members/actions"

export function MemberStatusDialog({
  member,
  mode,
  onClose,
}: {
  member: { id: string; name: string }
  mode: "deactivate" | "restore"
  onClose: () => void
}) {
  const router = useRouter()
  const onSuccess = () => {
    toast.success(mode === "deactivate" ? `${member.name} deactivated.` : `${member.name} restored.`)
    onClose()
    router.refresh()
  }
  const deactivate = useAction(deactivateMember, { onSuccess })
  const restore = useAction(restoreMember, { onSuccess })
  const busy = deactivate.isPending || restore.isPending
  const error = deactivate.result.serverError ?? restore.result.serverError

  return (
    <AlertDialog open onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{mode === "deactivate" ? "Deactivate member?" : "Restore member?"}</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="font-semibold text-foreground">{member.name}</span>{" "}
            {mode === "deactivate"
              ? "will be hidden from the member list and can't check in at meetings. The record and history are kept and can be restored later."
              : "will be active again and appear in the member list."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={busy}
            className={mode === "deactivate" ? "bg-destructive text-white hover:bg-destructive/90" : undefined}
            onClick={(event) => {
              event.preventDefault()
              if (mode === "deactivate") deactivate.execute({ id: member.id })
              else restore.execute({ id: member.id })
            }}
          >
            {busy && <Loader2 className="animate-spin" />}
            {mode === "deactivate" ? "Deactivate" : "Restore"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
