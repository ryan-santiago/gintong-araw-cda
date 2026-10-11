"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { QrCode } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { useCan, useViewer } from "@/components/viewer-provider"
import { isActivePath, navGroups } from "@/config/nav"

export function AppSidebar() {
  const pathname = usePathname()
  const { isMobile, setOpenMobile } = useSidebar()
  const can = useCan()
  const { pendingApprovals } = useViewer()
  const groups = navGroups
    .map((group) => ({ ...group, items: group.items.filter((item) => can(item.permission)) }))
    .filter((group) => group.items.length > 0)

  return (
    <Sidebar collapsible="icon" className="group-data-[side=left]:border-r-0">
      <SidebarHeader className="px-3 pt-5 pb-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => isMobile && setOpenMobile(false)}
        >
          <Image
            src="/brand/logo.png"
            alt=""
            width={40}
            height={37}
            className="size-9 shrink-0 object-contain"
            priority
          />
          <div className="grid leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-[15px] font-extrabold tracking-tight">Gintong Araw</span>
            <span className="text-[11px] text-muted-foreground">Community Dev&apos;t Assoc.</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-1">
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {group.items.map((item) => {
                  const active = isActivePath(pathname, item.href)
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.title}
                        className="h-10 rounded-xl px-3 font-medium data-active:font-semibold data-active:shadow-card data-active:[&>svg]:text-secondary"
                      >
                        <Link href={item.href} onClick={() => isMobile && setOpenMobile(false)}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                      {item.href === "/users" && pendingApprovals > 0 && (
                        <SidebarMenuBadge className="top-2.5 rounded-full bg-ink px-1.5 text-ink-foreground peer-hover/menu-button:text-ink-foreground peer-data-active/menu-button:text-ink-foreground">
                          {pendingApprovals}
                        </SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {can("attendance.capture") && (
        <SidebarFooter className="p-3 group-data-[collapsible=icon]:hidden">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-gold p-4 text-[#1c1b17]">
            <div
              aria-hidden
              className="absolute -top-8 -right-8 size-28 rounded-full bg-[radial-gradient(circle,rgb(255_255_255/0.55),transparent_70%)]"
            />
            <QrCode className="relative size-5" />
            <p className="relative mt-2 text-[15px] font-bold">Meeting day?</p>
            <p className="relative mb-3 text-xs opacity-80">Scan member IDs to record attendance.</p>
            <Button asChild className="relative w-full bg-[#1c1b17] text-white hover:bg-[#1c1b17]/85">
              <Link href="/attendance/capture" onClick={() => isMobile && setOpenMobile(false)}>
                <QrCode />
                Capture Attendance
              </Link>
            </Button>
          </div>
        </SidebarFooter>
      )}
      <SidebarRail />
    </Sidebar>
  )
}
