"use client"

import { useRouter } from "next/navigation"
import { Loader2, Trash2 } from "lucide-react"
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { deleteGroup } from "@/features/groups/actions"

export function DeleteGroupButton({
  id,
  name,
  memberCount,
  redirectTo,
}: {
  id: string
  name: string
  memberCount: number
  redirectTo?: string
}) {
  const router = useRouter()
  const { execute, isPending, result } = useAction(deleteGroup, {
    onSuccess: () => {
      toast.success(`Group "${name}" deleted.`)
      if (redirectTo) router.push(redirectTo)
      router.refresh()
    },
  })

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="icon" aria-label={`Delete ${name}`}>
          <Trash2 />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete &ldquo;{name}&rdquo;?</AlertDialogTitle>
          <AlertDialogDescription>
            {memberCount > 0
              ? `${memberCount} user${memberCount === 1 ? "" : "s"} will lose the permissions from this group. `
              : ""}
            This can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {result.serverError && <p className="text-sm text-destructive">{result.serverError}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault()
              execute({ id })
            }}
            disabled={isPending}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {isPending && <Loader2 className="animate-spin" />}
            Delete group
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
