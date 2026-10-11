"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const ALL = "__all"

export function AuditFiltersBar({
  actions,
  entities,
  actors,
}: {
  actions: { value: string; label: string }[]
  entities: string[]
  actors: { id: string; name: string }[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function set(key: string, value: string | undefined) {
    const sp = new URLSearchParams(searchParams.toString())
    if (value && value !== ALL) sp.set(key, value)
    else sp.delete(key)
    sp.delete("page")
    const s = sp.toString()
    router.push(s ? `${pathname}?${s}` : pathname)
  }

  const hasFilters = ["action", "actor", "entity", "from", "to"].some((k) => searchParams.has(k))

  return (
    <div className="mb-4 grid grid-cols-2 gap-2 md:flex md:flex-wrap md:items-center">
      <Select value={searchParams.get("action") ?? ALL} onValueChange={(v) => set("action", v)}>
        <SelectTrigger className="w-full md:w-52" aria-label="Action">
          <SelectValue placeholder="All actions" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All actions</SelectItem>
          {actions.map((a) => (
            <SelectItem key={a.value} value={a.value}>
              {a.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={searchParams.get("actor") ?? ALL} onValueChange={(v) => set("actor", v)}>
        <SelectTrigger className="w-full md:w-48" aria-label="User">
          <SelectValue placeholder="All users" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All users</SelectItem>
          {actors.map((a) => (
            <SelectItem key={a.id} value={a.id}>
              {a.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={searchParams.get("entity") ?? ALL} onValueChange={(v) => set("entity", v)}>
        <SelectTrigger className="w-full md:w-40" aria-label="Record type">
          <SelectValue placeholder="All records" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All records</SelectItem>
          {entities.map((e) => (
            <SelectItem key={e} value={e}>
              {e}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div
        key={`${searchParams.get("from")}-${searchParams.get("to")}`}
        className="col-span-2 flex items-center gap-2 md:col-span-1"
      >
        <Input
          type="date"
          aria-label="From date"
          className="md:w-40"
          defaultValue={searchParams.get("from") ?? ""}
          onChange={(e) => set("from", e.target.value || undefined)}
        />
        <span className="text-sm text-muted-foreground">to</span>
        <Input
          type="date"
          aria-label="To date"
          className="md:w-40"
          defaultValue={searchParams.get("to") ?? ""}
          onChange={(e) => set("to", e.target.value || undefined)}
        />
      </div>

      {hasFilters && (
        <Button variant="ghost" className="col-span-2 md:col-span-1" onClick={() => router.push(pathname)}>
          <X /> Clear filters
        </Button>
      )}
    </div>
  )
}
