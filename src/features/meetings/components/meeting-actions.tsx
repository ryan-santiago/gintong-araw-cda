"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Lock, LockOpen, Trash2 } from "lucide-react"
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
import { Button } from "@/components/ui/button"
import { deleteMeeting, setMeetingStatus } from "@/features/meetings/actions"

/** Open / close / delete buttons for a meeting (needs meeting.manage). */
export function MeetingActions({
  meeting,
  size = "default",
  redirectAfterDelete,
}: {
  meeting: { id: string; title: string; status: "SCHEDULED" | "OPEN" | "CLOSED"; present: number }
  size?: "default" | "sm"
  redirectAfterDelete?: string
}) {
  const router = useRouter()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const status = useAction(setMeetingStatus, {
    onSuccess: ({ input }) => {
      toast.success(input.status === "OPEN" ? "Meeting opened — you can now capture attendance." : "Meeting closed.")
      router.refresh()
    },
    onError: ({ error }) => toast.error(error.serverError ?? "Something went wrong."),
  })
  const remove = useAction(deleteMeeting, {
    onSuccess: () => {
      toast.success("Meeting deleted.")
      setConfirmDelete(false)
      if (redirectAfterDelete) router.push(redirectAfterDelete)
      router.refresh()
    },
  })

  return (
    <div className="flex flex-wrap gap-2">
      {meeting.status === "OPEN" ? (
        <Button
          size={size}
          variant="outline"
          disabled={status.isPending}
          onClick={() => status.execute({ id: meeting.id, status: "CLOSED" })}
        >
          {status.isPending ? <Loader2 className="animate-spin" /> : <Lock />} Close
        </Button>
      ) : (
        <Button
          size={size}
          variant={meeting.status === "SCHEDULED" ? "default" : "outline"}
          disabled={status.isPending}
          onClick={() => status.execute({ id: meeting.id, status: "OPEN" })}
        >
          {status.isPending ? <Loader2 className="animate-spin" /> : <LockOpen />}
          {meeting.status === "CLOSED" ? "Reopen" : "Open"}
        </Button>
      )}
      {meeting.present === 0 && (
        <Button size={size} variant="ghost" aria-label="Delete meeting" onClick={() => setConfirmDelete(true)}>
          <Trash2 className="text-destructive" />
        </Button>
      )}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{meeting.title}”?</AlertDialogTitle>
            <AlertDialogDescription>It has no attendance yet. This can&apos;t be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          {remove.result.serverError && <p className="text-sm text-destructive">{remove.result.serverError}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={remove.isPending}
              onClick={(e) => {
                e.preventDefault()
                remove.execute({ id: meeting.id })
              }}
            >
              {remove.isPending && <Loader2 className="animate-spin" />} Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
