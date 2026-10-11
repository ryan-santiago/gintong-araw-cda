import { Suspense } from "react"
import type { Metadata } from "next"

import { PendingNotice } from "@/features/auth/components/pending-notice"

export const metadata: Metadata = { title: "Awaiting access" }

export default function PendingPage() {
  return (
    <Suspense>
      <PendingNotice />
    </Suspense>
  )
}
