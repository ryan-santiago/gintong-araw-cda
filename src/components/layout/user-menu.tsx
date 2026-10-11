"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { KeyRound, LogOut } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useViewer } from "@/components/viewer-provider"
import { authClient } from "@/lib/auth-client"

export function UserMenu() {
  const user = useViewer()
  const router = useRouter()

  async function signOut() {
    await authClient.signOut()
    router.replace("/login")
    router.refresh()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex h-10 items-center gap-2.5 rounded-xl bg-card p-1 shadow-card outline-none focus-visible:ring-2 focus-visible:ring-ring sm:pr-3.5">
        <Avatar className="size-8">
          <AvatarFallback className="bg-[#d5eedd] text-xs font-bold text-[#154d34]">{user.initials}</AvatarFallback>
        </Avatar>
        <span className="hidden max-w-40 text-left leading-tight sm:grid">
          <span className="truncate text-[13px] font-semibold">{user.name}</span>
          <span className="truncate text-[11px] text-muted-foreground">{user.groupName}</span>
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="grid">
          <span className="truncate font-semibold">{user.name}</span>
          <span className="truncate text-xs font-normal text-muted-foreground">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/change-password">
            <KeyRound /> Change password
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={signOut}>
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
