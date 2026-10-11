import { Suspense } from "react"

import { AppShellSkeleton } from "@/components/layout/app-shell-skeleton"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { AppTopbar } from "@/components/layout/app-topbar"
import { MobileNav } from "@/components/layout/mobile-nav"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { ViewerProvider } from "@/components/viewer-provider"
import { db } from "@/lib/db"
import { can, requireViewer } from "@/lib/rbac"
import { initials } from "@/lib/utils"

// Cache Components: the session is request data, so it is read inside a
// Suspense boundary rather than at the top of the layout.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<AppShellSkeleton />}>
      <AuthedShell>{children}</AuthedShell>
    </Suspense>
  )
}

async function AuthedShell({ children }: { children: React.ReactNode }) {
  const viewer = await requireViewer()
  const pendingApprovals = can(viewer, "user.approve") ? await db.user.count({ where: { status: "PENDING" } }) : 0

  return (
    <ViewerProvider
      value={{
        id: viewer.id,
        name: viewer.name,
        email: viewer.email,
        initials: initials(viewer.name),
        groupName: viewer.groups[0]?.name ?? "",
        permissions: viewer.permissions,
        pendingApprovals,
      }}
    >
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="min-w-0 bg-background">
          <AppTopbar />
          <div className="mx-auto w-full max-w-360 flex-1 px-4 pb-28 md:px-6 md:pb-10">{children}</div>
          <MobileNav />
        </SidebarInset>
      </SidebarProvider>
    </ViewerProvider>
  )
}
