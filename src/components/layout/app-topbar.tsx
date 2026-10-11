import Image from "next/image"
import Link from "next/link"

import { CommandMenu } from "@/components/layout/command-menu"
import { NotificationsButton } from "@/components/layout/notifications-button"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { UserMenu } from "@/components/layout/user-menu"
import { SidebarTrigger } from "@/components/ui/sidebar"

export function AppTopbar() {
  return (
    <header className="sticky top-0 z-20 flex items-center gap-2 bg-background/85 px-4 py-3 backdrop-blur-md sm:gap-3 md:px-6 md:py-4">
      <SidebarTrigger className="hidden size-10 rounded-xl bg-card shadow-card md:inline-flex" />
      <Link href="/dashboard" className="shrink-0 md:hidden" aria-label="Gintong Araw home">
        <Image src="/brand/logo.png" alt="" width={36} height={33} className="size-9 object-contain" />
      </Link>

      <div className="min-w-0 flex-1">
        <CommandMenu />
      </div>

      <ThemeToggle />
      <NotificationsButton />
      <UserMenu />
    </header>
  )
}
