"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { KeyRound, Monitor, Moon, QrCode, Search, Sun, UserPlus } from "lucide-react"
import { useTheme } from "next-themes"

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { useCan } from "@/components/viewer-provider"
import { navGroups } from "@/config/nav"

export function CommandMenu() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const { setTheme } = useTheme()
  const can = useCan()
  const groups = navGroups
    .map((group) => ({ ...group, items: group.items.filter((item) => can(item.permission)) }))
    .filter((group) => group.items.length > 0)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen((value) => !value)
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])

  function run(action: () => void) {
    setOpen(false)
    action()
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 w-full max-w-sm items-center gap-2 rounded-xl bg-card px-3.5 text-sm text-muted-foreground shadow-card transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Search className="size-4" />
        <span className="truncate">Search members, tracking no.…</span>
        <kbd className="ml-auto hidden rounded-md border px-1.5 font-sans text-[11px] sm:inline">Ctrl K</kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen} title="Search" description="Jump to a page or run an action">
        <CommandInput placeholder="Type a page or action…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Quick actions">
            {can("attendance.capture") && (
              <CommandItem onSelect={() => run(() => router.push("/attendance/capture"))}>
                <QrCode />
                Capture attendance
              </CommandItem>
            )}
            {can("member.create") && (
              <CommandItem onSelect={() => run(() => router.push("/members/new"))}>
                <UserPlus />
                Add member
              </CommandItem>
            )}
            <CommandItem onSelect={() => run(() => router.push("/change-password"))}>
              <KeyRound />
              Change password
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          {groups.map((group) => (
            <CommandGroup key={group.label} heading={group.label}>
              {group.items.map((item) => (
                <CommandItem
                  key={item.href}
                  value={`${item.title} ${item.description}`}
                  onSelect={() => run(() => router.push(item.href))}
                >
                  <item.icon />
                  {item.title}
                  <CommandShortcut className="hidden sm:inline">{item.description}</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
          <CommandSeparator />
          <CommandGroup heading="Theme">
            <CommandItem onSelect={() => run(() => setTheme("light"))}>
              <Sun /> Light
            </CommandItem>
            <CommandItem onSelect={() => run(() => setTheme("dark"))}>
              <Moon /> Dark
            </CommandItem>
            <CommandItem onSelect={() => run(() => setTheme("system"))}>
              <Monitor /> System
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
