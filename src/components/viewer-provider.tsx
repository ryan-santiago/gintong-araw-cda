"use client"

import { createContext, useContext } from "react"

import type { PermissionKey } from "@/lib/permissions"

export type ClientViewer = {
  id: string
  name: string
  email: string
  initials: string
  groupName: string
  permissions: PermissionKey[]
  pendingApprovals: number
}

const ViewerContext = createContext<ClientViewer | null>(null)

export function ViewerProvider({ value, children }: { value: ClientViewer; children: React.ReactNode }) {
  return <ViewerContext.Provider value={value}>{children}</ViewerContext.Provider>
}

export function useViewer() {
  const viewer = useContext(ViewerContext)
  if (!viewer) throw new Error("useViewer must be used inside <ViewerProvider>")
  return viewer
}

/** UI-only permission check. The server always checks again. */
export function useCan() {
  const { permissions } = useViewer()
  return (permission: PermissionKey) => permissions.includes(permission)
}
