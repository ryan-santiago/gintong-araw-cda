"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Ban,
  Check,
  Copy,
  KeyRound,
  Loader2,
  MoreHorizontal,
  RotateCcw,
  ShieldCheck,
  UserCheck,
  UserX,
  Users,
} from "lucide-react"
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { approveUser, rejectUser, resetUserPassword, setUserGroups, setUserStatus } from "@/features/users/actions"
import { UserStatusBadge } from "@/features/users/components/user-status-badge"
import { initials } from "@/lib/utils"

export type UserRow = {
  id: string
  name: string
  email: string
  status: "PENDING" | "ACTIVE" | "SUSPENDED"
  groups: { id: string; name: string }[]
  createdAt: string
  lastLoginAt: string | null
  isSelf: boolean
  manageable: boolean
}

type GroupOption = { id: string; name: string; rank: number; assignable: boolean }

type DialogState =
  | { kind: "approve" | "groups" | "reject" | "suspend" | "reactivate" | "reset"; user: UserRow }
  | { kind: "password"; user: UserRow; password: string }
  | null

export function UsersTable({
  rows,
  groups,
  canApprove,
  canManage,
}: {
  rows: UserRow[]
  groups: GroupOption[]
  canApprove: boolean
  canManage: boolean
}) {
  const [dialog, setDialog] = useState<DialogState>(null)

  if (rows.length === 0) {
    return (
      <div className="grid justify-items-center gap-2 px-6 py-16 text-center">
        <Users className="size-8 text-muted-foreground" />
        <p className="font-semibold">No users found</p>
        <p className="text-sm text-muted-foreground">Try another filter or search.</p>
      </div>
    )
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-5">User</TableHead>
            <TableHead className="hidden md:table-cell">Groups</TableHead>
            <TableHead className="hidden sm:table-cell">Status</TableHead>
            <TableHead className="hidden lg:table-cell">Last sign-in</TableHead>
            <TableHead className="w-12 pr-5">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((user) => (
            <TableRow key={user.id} className="hover:bg-accent/60">
              <TableCell className="w-full max-w-0 py-3 pl-5">
                <div className="flex items-center gap-3">
                  <Avatar className="size-9">
                    <AvatarFallback className="bg-[#d5eedd] text-xs font-bold text-[#154d34]">
                      {initials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">
                      {user.name}
                      {user.isSelf && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(you)</span>}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                    <div className="mt-1 sm:hidden">
                      <UserStatusBadge status={user.status} />
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {user.groups.length ? (
                  <div className="flex flex-wrap gap-1">
                    {user.groups.map((g) => (
                      <span key={g.id} className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                        {g.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <UserStatusBadge status={user.status} />
              </TableCell>
              <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                {user.lastLoginAt ?? `Registered ${user.createdAt}`}
              </TableCell>
              <TableCell className="pr-5 text-right">
                <RowActions user={user} canApprove={canApprove} canManage={canManage} onOpen={setDialog} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {dialog && (dialog.kind === "approve" || dialog.kind === "groups") && (
        <GroupsDialog
          key={dialog.user.id + dialog.kind}
          mode={dialog.kind}
          user={dialog.user}
          groups={groups}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog && (dialog.kind === "reject" || dialog.kind === "suspend" || dialog.kind === "reactivate") && (
        <ConfirmDialog kind={dialog.kind} user={dialog.user} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === "reset" && (
        <ResetPasswordDialog
          user={dialog.user}
          onClose={() => setDialog(null)}
          onDone={(password) => setDialog({ kind: "password", user: dialog.user, password })}
        />
      )}
      {dialog?.kind === "password" && (
        <TemporaryPasswordDialog user={dialog.user} password={dialog.password} onClose={() => setDialog(null)} />
      )}
    </>
  )
}

function RowActions({
  user,
  canApprove,
  canManage,
  onOpen,
}: {
  user: UserRow
  canApprove: boolean
  canManage: boolean
  onOpen: (state: DialogState) => void
}) {
  const pending = user.status === "PENDING"
  const showApprove = pending && canApprove
  const showManage = !pending && canManage && user.manageable
  if (!showApprove && !showManage) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Actions for ${user.name}`}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {showApprove && (
          <>
            <DropdownMenuItem onSelect={() => onOpen({ kind: "approve", user })}>
              <UserCheck /> Approve…
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={() => onOpen({ kind: "reject", user })}>
              <UserX /> Reject
            </DropdownMenuItem>
          </>
        )}
        {showManage && (
          <>
            <DropdownMenuItem onSelect={() => onOpen({ kind: "groups", user })}>
              <ShieldCheck /> Change groups…
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onOpen({ kind: "reset", user })}>
              <KeyRound /> Reset password…
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {user.status === "ACTIVE" ? (
              <DropdownMenuItem variant="destructive" onSelect={() => onOpen({ kind: "suspend", user })}>
                <Ban /> Suspend
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onSelect={() => onOpen({ kind: "reactivate", user })}>
                <RotateCcw /> Reactivate
              </DropdownMenuItem>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function GroupsDialog({
  mode,
  user,
  groups,
  onClose,
}: {
  mode: "approve" | "groups"
  user: UserRow
  groups: GroupOption[]
  onClose: () => void
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<string[]>(user.groups.map((g) => g.id))
  const onSuccess = () => {
    toast.success(mode === "approve" ? `${user.name} approved.` : "Groups updated.")
    onClose()
    router.refresh()
  }
  const approve = useAction(approveUser, { onSuccess })
  const update = useAction(setUserGroups, { onSuccess })
  const busy = approve.isPending || update.isPending
  const error =
    approve.result.serverError ??
    update.result.serverError ??
    (approve.hasErrored ? "Check the selected groups." : undefined)

  function submit() {
    if (mode === "approve") approve.execute({ userId: user.id, groupIds: selected })
    else update.execute({ userId: user.id, groupIds: selected })
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "approve" ? `Approve ${user.name}` : `Groups for ${user.name}`}</DialogTitle>
          <DialogDescription>
            {mode === "approve"
              ? "Choose the groups this user belongs to. Their permissions come from these groups."
              : "Permissions are the combination of every group the user is in."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-1.5">
          {groups.map((group) => {
            const checked = selected.includes(group.id)
            return (
              <label
                key={group.id}
                className="flex items-center gap-3 rounded-xl border px-3 py-2.5 has-disabled:opacity-50 has-data-[state=checked]:border-primary has-data-[state=checked]:bg-accent/60"
              >
                <Checkbox
                  checked={checked}
                  disabled={!group.assignable}
                  onCheckedChange={(value) =>
                    setSelected((prev) => (value ? [...prev, group.id] : prev.filter((id) => id !== group.id)))
                  }
                />
                <span className="flex-1 text-sm font-medium">{group.name}</span>
                <span className="font-mono text-xs text-muted-foreground">rank {group.rank}</span>
              </label>
            )
          })}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy || (mode === "approve" && selected.length === 0)}>
            {busy ? <Loader2 className="animate-spin" /> : <Check />}
            {mode === "approve" ? "Approve" : "Save groups"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const confirmCopy = {
  reject: {
    title: "Reject this registration?",
    body: "The account request will be deleted. They can register again later.",
    action: "Reject",
  },
  suspend: {
    title: "Suspend this user?",
    body: "They will be signed out immediately and won't be able to sign in until reactivated.",
    action: "Suspend",
  },
  reactivate: {
    title: "Reactivate this user?",
    body: "They will be able to sign in again with their existing groups.",
    action: "Reactivate",
  },
} as const

function ConfirmDialog({
  kind,
  user,
  onClose,
}: {
  kind: "reject" | "suspend" | "reactivate"
  user: UserRow
  onClose: () => void
}) {
  const router = useRouter()
  const onSuccess = () => {
    toast.success(`${user.name}: ${confirmCopy[kind].action.toLowerCase()} done.`)
    onClose()
    router.refresh()
  }
  const reject = useAction(rejectUser, { onSuccess })
  const status = useAction(setUserStatus, { onSuccess })
  const busy = reject.isPending || status.isPending
  const error = reject.result.serverError ?? status.result.serverError

  function confirm() {
    if (kind === "reject") reject.execute({ userId: user.id })
    else status.execute({ userId: user.id, status: kind === "suspend" ? "SUSPENDED" : "ACTIVE" })
  }

  return (
    <AlertDialog open onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{confirmCopy[kind].title}</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="font-semibold text-foreground">{user.name}</span> ({user.email}). {confirmCopy[kind].body}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault()
              confirm()
            }}
            disabled={busy}
            className={kind === "reactivate" ? undefined : "bg-destructive text-white hover:bg-destructive/90"}
          >
            {busy && <Loader2 className="animate-spin" />}
            {confirmCopy[kind].action}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function ResetPasswordDialog({
  user,
  onClose,
  onDone,
}: {
  user: UserRow
  onClose: () => void
  onDone: (password: string) => void
}) {
  const reset = useAction(resetUserPassword, {
    onSuccess: ({ data }) => data && onDone(data.temporaryPassword),
  })

  return (
    <AlertDialog open onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset password for {user.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            A temporary password will be created and shown once. They will be signed out and must choose a new password
            the next time they sign in.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {reset.result.serverError && <p className="text-sm text-destructive">{reset.result.serverError}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault()
              reset.execute({ userId: user.id })
            }}
            disabled={reset.isPending}
          >
            {reset.isPending ? <Loader2 className="animate-spin" /> : <KeyRound />}
            Reset password
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function TemporaryPasswordDialog({
  user,
  password,
  onClose,
}: {
  user: UserRow
  password: string
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(password)
    setCopied(true)
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Temporary password</DialogTitle>
          <DialogDescription>
            Give this to <span className="font-semibold text-foreground">{user.name}</span> in person or by a private
            message. It won&apos;t be shown again.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 rounded-xl border bg-muted px-4 py-3">
          <code className="flex-1 font-mono text-lg font-semibold tracking-wider">{password}</code>
          <Button variant="outline" size="sm" onClick={copy}>
            {copied ? <Check /> : <Copy />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
