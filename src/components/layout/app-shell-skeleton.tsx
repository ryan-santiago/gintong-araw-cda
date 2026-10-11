import Image from "next/image"

import { Skeleton } from "@/components/ui/skeleton"

export function AppShellSkeleton() {
  return (
    <div className="flex min-h-svh" aria-busy="true" aria-label="Loading">
      <aside className="hidden w-64 shrink-0 flex-col gap-2 px-3 pt-5 md:flex">
        <div className="mb-4 flex items-center gap-2.5 px-1">
          <Image src="/brand/logo.png" alt="" width={36} height={33} className="size-9 object-contain" priority />
          <Skeleton className="h-4 w-28" />
        </div>
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-10 rounded-xl" />
        ))}
      </aside>
      <div className="flex-1 px-4 py-4 md:px-6">
        <div className="mb-6 flex gap-3">
          <Skeleton className="h-10 w-full max-w-sm rounded-xl" />
          <div className="flex-1" />
          <Skeleton className="size-10 rounded-xl" />
          <Skeleton className="h-10 w-40 rounded-xl" />
        </div>
        <Skeleton className="mb-6 h-8 w-48" />
        <div className="grid gap-4 lg:grid-cols-12">
          <Skeleton className="h-72 rounded-2xl lg:col-span-8" />
          <Skeleton className="h-72 rounded-2xl lg:col-span-4" />
          <Skeleton className="h-56 rounded-2xl lg:col-span-12" />
        </div>
      </div>
    </div>
  )
}
