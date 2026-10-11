"use client"

import Link from "next/link"
import { Bell, UserCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useViewer } from "@/components/viewer-provider"

export function NotificationsButton() {
  const { pendingApprovals } = useViewer()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon-lg"
          className="relative rounded-xl border-0 shadow-card"
          aria-label={pendingApprovals ? `Notifications: ${pendingApprovals} pending` : "Notifications"}
        >
          <Bell />
          {pendingApprovals > 0 && (
            <span className="absolute top-2 right-2.5 size-2 rounded-full bg-primary ring-2 ring-card" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {pendingApprovals > 0 ? (
          <DropdownMenuItem asChild>
            <Link href="/users?status=PENDING" className="items-start">
              <UserCheck className="mt-0.5" />
              <span>
                <span className="block font-semibold">
                  {pendingApprovals} account{pendingApprovals === 1 ? "" : "s"} awaiting approval
                </span>
                <span className="text-xs text-muted-foreground">Review and assign a group</span>
              </span>
            </Link>
          </DropdownMenuItem>
        ) : (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">You&apos;re all caught up.</p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
